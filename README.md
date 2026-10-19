# Galaxy Service Hub

Galaxy Online Power Systems – Complete Service Management Portal

Project Objective

Build a complete production-ready web application for Galaxy Online Power Systems.

This portal will be used internally across PAN India by our company for service management, installation reports, preventive maintenance, ticket assignment, technician management, and analytics.

The application should be scalable, mobile-friendly, modern, and production-ready.

Technology Stack

Frontend

Next.js

TypeScript

Tailwind CSS

Backend

Supabase PostgreSQL Database

Supabase Authentication

Hosting

Lovable (initially)

The project should remain portable so it can later be deployed to Vercel or any other hosting platform without major code changes.

Important Database Requirement

I want to continue using Supabase PostgreSQL because it is reliable and enough for my project.

However,

Supabase will only be used for metadata.

Do NOT store any large files inside Supabase Storage.

Google Drive Integration

I already have 5TB Google Drive storage.

I want Google Drive to become the primary file storage.

Store directly inside Google Drive:

Photos

Customer Signatures

Engineer Signatures

Generated PDFs

Attachments

Documents

Only store these inside Supabase:

Google Drive File ID

Google Drive Folder ID

Google Drive Link

The application should fetch files dynamically from Google Drive whenever required.

Folder Structure

Automatically create folders like this:

Galaxy Service Reports

→ Year

→ Month

→ Customer Name or Ticket Number

Example

Galaxy Service Reports

→ 2026

→ August

→ Ticket-1001

→ Photos

→ Report.pdf

Authentication

Implement secure authentication.

Roles:

Super Admin

Admin

Manager

Technician

Super Admin

Super Admin has complete control.

Permissions:

Create Admin

Create Manager

Create Technician

Edit Users

Delete Users

Reset Passwords

Assign Roles

Configure Permissions

View Reports

View Analytics

Export Data

Restore Backup

Admin

Permissions

Create Tickets

Assign Tickets

Edit Tickets

Manage Technicians

View All Reports

Download Reports

Search Reports

Dashboard Access

Manager

Managers should have customizable permissions.

The Super Admin should decide which permissions a manager receives.

Examples:

Create Tickets

Assign Tickets

View Reports

Download Reports

Manage Technicians

Implement proper RBAC (Role-Based Access Control).

Technician

Technicians should only access their own work.

Permissions

Login

View Assigned Tickets

Fill Service Report

Upload Photos

Capture Signatures

Submit Report

Download PDF

View Own Report History

Technicians must never access other technicians' reports.

Technician Profile

Every technician should have:

Employee ID

Name

Mobile Number

Email

Zone

State

City

Branch

Reporting Manager

Status

Zones:

North

South

East

West

Central

Dashboard

Admin Dashboard

Cards

Total Tickets

Open Tickets

Assigned Tickets

Completed

Closed

Pending

Total Reports

Today's Reports

Total Technicians

Today's Visits

Monthly Visits

Charts

Reports by Zone

Reports by State

Reports by Technician

Monthly Reports

Ticket Status

Technician Performance

Ticket System

Only Admin and Manager can create tickets.

Ticket Fields

Auto Ticket Number

Customer Name

Company Name

Site Name

Site Address

State

City

Contact Person

Contact Number

Complaint

UPS Make

UPS Model

UPS Capacity

UPS Serial Number

Battery Details

Priority

Assigned Technician

Visit Date

Status

Open

Assigned

In Progress

Completed

Closed

Technician Dashboard

Each technician should only see:

"My Assigned Tickets"

Each card should display:

Customer

Site

Complaint

Priority

Visit Date

Status

When technician clicks

"Fill Report"

All ticket information should automatically populate inside the report.

No duplicate typing should be required.

Service Report

Auto Generate Report Number.

General

Report Number

Date

Engineer Name

Customer

Customer Name

Company

Site

Address

Contact Number

UPS

Make

Model

Capacity

Serial Number

Battery

Make

Model

Quantity

Serial Numbers

Electrical Readings

Input Voltage

Output Voltage

Battery Voltage

Frequency

Load

Checklist

UPS Installed

Battery Installed

Earthing

Charging

Output Checked

Service

Complaint

Fault Found

Root Cause

Work Done

Spare Parts Used

Recommendations

Attachments

Maximum 10 Photos

Customer Signature

Engineer Signature

Remarks

Photo Upload

Automatically compress images before upload.

Requirements

Preserve quality

Fast upload

Maximum approximately 300–400 KB after compression

Mobile camera support

PDF Generation

Generate PDF exactly matching our existing Galaxy Service Report format.

Requirements

Same layout

Same spacing

Same tables

Same logo position

Same signature placement

Embedded Photos

Professional print layout

The generated PDF should look identical to our existing report.

Search

Allow searching by:

Report Number

Ticket Number

Customer

Technician Analytics

Clicking a technician should display:

Total Site Visits

Total Reports

Open Tickets

Closed Tickets

Pending Tickets

Completed Jobs

Average Completion Time

Recall Visits

Monthly Performance

Zone

Branch

Recall Feature

If another complaint is raised for the same site within 7 days,

Automatically mark it as

"Recall Visit"

Show Recall statistics in technician performance.

Notifications

Future-ready architecture for:

WhatsApp

Email

Push Notifications

Do not implement now, but structure the project so these can be added later.

Backup

Inside Admin Panel create:

Backup Center

Allow:

Export SQL Backup

Export CSV

Export Excel

Future support:

Restore Backup

Performance

Optimize for:

50–100 Technicians

Around 50–60 Reports Per Day

PAN India Operations

Use proper database indexing and efficient queries.

Security

Implement:

Role Based Access Control (RBAC)

Secure Authentication

Protected API Routes

Audit Logs

Input Validation

Future Proof

Avoid vendor lock-in.

Use standard PostgreSQL tables.

Do not use Supabase-specific database features that make migration difficult.

The project should be easily movable to:

PostgreSQL

Neon

AWS RDS

Self-hosted PostgreSQL

without changing business logic.

Final Goal

Build a fast, professional, production-ready Service Management Portal for Galaxy Online Power Systems.

The application should be simple enough for technicians to use from mobile devices while providing powerful reporting, ticket management, analytics, PDF generation, Google Drive integration, and scalable architecture for future growth.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://galaxy-power-flow.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c4f60957-044d-4821-a043-b688e4b760c6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
