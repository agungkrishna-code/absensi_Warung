export type Role = "admin" | "employee";
export type AttendanceStatus = "present" | "late";
export type EmploymentStatus = "active" | "inactive";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string;
  role: Role;
  created_at: string;
}

export interface Employee {
  id: string;
  profile_id: string | null;
  employee_code: string;
  full_name: string;
  phone: string | null;
  position: string | null;
  employment_status: EmploymentStatus;
  created_at: string;
}

export interface EmployeeWithProfile extends Employee {
  profiles: Pick<Profile, "email" | "full_name"> | null;
}

export interface WorkSchedule {
  id: string;
  employee_id: string;
  work_date: string;
  shift_start: string;
  shift_end: string;
  created_at: string;
}

export interface WorkScheduleWithEmployee extends WorkSchedule {
  employees: Pick<Employee, "full_name" | "employee_code"> | null;
}

export interface Attendance {
  id: string;
  employee_id: string;
  work_date: string;
  check_in: string;
  check_out: string | null;
  status: AttendanceStatus;
  created_at: string;
}

export interface AttendanceWithEmployee extends Attendance {
  employees: Pick<Employee, "full_name" | "employee_code"> | null;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}
