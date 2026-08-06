-- ENUMS
CREATE TYPE public.app_role AS ENUM ('super_admin','admin','manager','technician');
CREATE TYPE public.zone_type AS ENUM ('North','South','East','West','Central');
CREATE TYPE public.ticket_status AS ENUM ('Open','Assigned','In Progress','Completed','Closed');
CREATE TYPE public.ticket_priority AS ENUM ('Low','Medium','High','Critical');
CREATE TYPE public.user_status AS ENUM ('Active','Inactive');

-- UPDATED_AT HELPER
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  employee_id text UNIQUE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  mobile text,
  zone public.zone_type,
  state text,
  city text,
  branch text,
  reporting_manager_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status public.user_status NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- USER ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('super_admin','admin','manager'));
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('super_admin','admin'));
$$;

-- MANAGER PERMISSIONS
CREATE TABLE public.manager_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  can_create_tickets boolean NOT NULL DEFAULT false,
  can_assign_tickets boolean NOT NULL DEFAULT false,
  can_edit_tickets boolean NOT NULL DEFAULT false,
  can_view_reports boolean NOT NULL DEFAULT true,
  can_download_reports boolean NOT NULL DEFAULT false,
  can_manage_technicians boolean NOT NULL DEFAULT false,
  can_export_data boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manager_permissions TO authenticated;
GRANT ALL ON public.manager_permissions TO service_role;
ALTER TABLE public.manager_permissions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_mgrperm_updated BEFORE UPDATE ON public.manager_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _perm text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE ok boolean;
BEGIN
  IF public.is_admin(_user_id) THEN RETURN true; END IF;
  EXECUTE format('SELECT COALESCE((SELECT %I FROM public.manager_permissions WHERE user_id = $1), false)', _perm)
    INTO ok USING _user_id;
  RETURN COALESCE(ok,false);
END; $$;

-- TICKETS
CREATE SEQUENCE public.ticket_number_seq START 1001;
CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE DEFAULT ('TKT-' || nextval('public.ticket_number_seq')::text),
  customer_name text NOT NULL,
  company_name text,
  site_name text,
  site_address text,
  state text,
  city text,
  zone public.zone_type,
  contact_person text,
  contact_number text,
  complaint text NOT NULL DEFAULT '',
  ups_make text, ups_model text, ups_capacity text, ups_serial text,
  battery_details text,
  priority public.ticket_priority NOT NULL DEFAULT 'Medium',
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  visit_date date,
  status public.ticket_status NOT NULL DEFAULT 'Open',
  is_recall boolean NOT NULL DEFAULT false,
  recall_of uuid REFERENCES public.tickets(id) ON DELETE SET NULL,
  created_by uuid,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO service_role;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_tickets_updated BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_tickets_assigned ON public.tickets(assigned_to);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_created ON public.tickets(created_at DESC);
CREATE INDEX idx_tickets_site ON public.tickets(lower(coalesce(site_name,'')), lower(customer_name));
CREATE INDEX idx_tickets_zone ON public.tickets(zone);

-- RECALL DETECTION
CREATE OR REPLACE FUNCTION public.detect_recall()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prev uuid;
BEGIN
  SELECT id INTO prev FROM public.tickets t
   WHERE t.id <> NEW.id
     AND lower(t.customer_name) = lower(NEW.customer_name)
     AND coalesce(lower(t.site_name),'') = coalesce(lower(NEW.site_name),'')
     AND t.created_at > now() - interval '7 days'
   ORDER BY t.created_at DESC LIMIT 1;
  IF prev IS NOT NULL THEN NEW.is_recall := true; NEW.recall_of := prev; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_tickets_recall BEFORE INSERT ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.detect_recall();

-- SERVICE REPORTS
CREATE SEQUENCE public.report_number_seq START 1001;
CREATE TABLE public.service_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_number text NOT NULL UNIQUE DEFAULT ('GSR-' || nextval('public.report_number_seq')::text),
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE SET NULL,
  technician_id uuid NOT NULL,
  report_date date NOT NULL DEFAULT current_date,
  engineer_name text,
  customer_name text, company_name text, site_name text, site_address text, contact_number text,
  ups_make text, ups_model text, ups_capacity text, ups_serial text,
  battery_make text, battery_model text, battery_qty integer, battery_serials text,
  input_voltage text, output_voltage text, battery_voltage text, frequency text, load_pct text,
  chk_ups_installed boolean NOT NULL DEFAULT false,
  chk_battery_installed boolean NOT NULL DEFAULT false,
  chk_earthing boolean NOT NULL DEFAULT false,
  chk_charging boolean NOT NULL DEFAULT false,
  chk_output_checked boolean NOT NULL DEFAULT false,
  complaint text, fault_found text, root_cause text, work_done text, spare_parts text, recommendations text, remarks text,
  customer_signature_drive_id text, customer_signature_url text,
  engineer_signature_drive_id text, engineer_signature_url text,
  pdf_drive_id text, pdf_url text,
  drive_folder_id text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_reports TO authenticated;
GRANT ALL ON public.service_reports TO service_role;
ALTER TABLE public.service_reports ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_reports_updated BEFORE UPDATE ON public.service_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_reports_tech ON public.service_reports(technician_id);
CREATE INDEX idx_reports_date ON public.service_reports(report_date DESC);
CREATE INDEX idx_reports_ticket ON public.service_reports(ticket_id);

-- ATTACHMENTS (Google Drive metadata only)
CREATE TABLE public.report_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.service_reports(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'photo',
  file_name text,
  drive_file_id text NOT NULL,
  drive_folder_id text,
  drive_link text,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_attachments TO authenticated;
GRANT ALL ON public.report_attachments TO service_role;
ALTER TABLE public.report_attachments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_attach_report ON public.report_attachments(report_id);

-- AUDIT LOGS
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity text,
  entity_id text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);

-- NEW USER HANDLER: profile + first user becomes super admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE first_user boolean;
BEGIN
  INSERT INTO public.profiles (id, full_name, email, employee_id, mobile)
  VALUES (NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'full_name',''),
          COALESCE(NEW.email,''),
          NULLIF(NEW.raw_user_meta_data->>'employee_id',''),
          NEW.raw_user_meta_data->>'mobile')
  ON CONFLICT (id) DO NOTHING;

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO first_user;
  IF first_user THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
  ELSIF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, (NEW.raw_user_meta_data->>'role')::public.app_role)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- POLICIES
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "staff read profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "admin manage profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "staff read roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "super admin manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "own perms read" ON public.manager_permissions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "super admin manage perms" ON public.manager_permissions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "staff read tickets" ON public.tickets FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "tech read own tickets" ON public.tickets FOR SELECT TO authenticated USING (assigned_to = auth.uid());
CREATE POLICY "create tickets" ON public.tickets FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(),'can_create_tickets'));
CREATE POLICY "edit tickets" ON public.tickets FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(),'can_edit_tickets') OR assigned_to = auth.uid()) WITH CHECK (public.has_permission(auth.uid(),'can_edit_tickets') OR assigned_to = auth.uid());
CREATE POLICY "admin delete tickets" ON public.tickets FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "staff read reports" ON public.service_reports FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "tech read own reports" ON public.service_reports FOR SELECT TO authenticated USING (technician_id = auth.uid());
CREATE POLICY "tech insert own reports" ON public.service_reports FOR INSERT TO authenticated WITH CHECK (technician_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "tech update own reports" ON public.service_reports FOR UPDATE TO authenticated USING (technician_id = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (technician_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "admin delete reports" ON public.service_reports FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "read attachments" ON public.report_attachments FOR SELECT TO authenticated USING (
  public.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.service_reports r WHERE r.id = report_id AND r.technician_id = auth.uid()));
CREATE POLICY "write attachments" ON public.report_attachments FOR INSERT TO authenticated WITH CHECK (
  public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.service_reports r WHERE r.id = report_id AND r.technician_id = auth.uid()));
CREATE POLICY "delete attachments" ON public.report_attachments FOR DELETE TO authenticated USING (
  public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.service_reports r WHERE r.id = report_id AND r.technician_id = auth.uid()));

CREATE POLICY "admin read audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "any insert audit" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());