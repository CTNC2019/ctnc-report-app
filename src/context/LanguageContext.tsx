"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "vi" | "en";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "vi",
  setLang: () => {},
  t: (key) => key,
});

export const translations: Record<Language, Record<string, string>> = {
  vi: {
    // Login page
    "app.title": "CTNC Report",
    "app.subtitle": "Hệ thống quản lý báo cáo dự án CTNC",
    "login.userId": "Mã thành viên (User ID)",
    "login.userId.placeholder": "VD: CTNC-01",
    "login.password": "Mật khẩu",
    "login.password.placeholder": "••••••••",
    "login.submit": "Đăng nhập",
    "login.loading": "Đang xác thực...",
    "login.error": "Mã User ID hoặc mật khẩu không đúng.",
    "login.forgotPassword": "Quên mật khẩu?",
    "login.signup": "Đăng ký tài khoản",
    // Forgot password modal
    "forgot.title": "Quên mật khẩu?",
    "forgot.desc": "Mật khẩu được quản lý bởi Admin hệ thống CTNC. Vui lòng liên hệ Admin để được đặt lại mật khẩu.",
    "forgot.contact": "Liên hệ Admin",
    "forgot.understood": "Đã hiểu",
    // Signup modal
    "signup.title": "Đăng ký tài khoản mới",
    "signup.desc": "Hệ thống CTNC Report sử dụng tài khoản được cấp phát bởi Admin. Người dùng không thể tự đăng ký.",
    "signup.request": "Yêu cầu cấp tài khoản",
    "signup.sendEmail": "Gửi email đến Admin với nội dung:",
    "signup.fullName": "Họ và tên đầy đủ",
    "signup.workEmail": "Email công việc",
    "signup.area": "Khu vực phụ trách",
    "signup.understood": "Đã hiểu",
    // Dashboard
    "dash.greeting": "Xin chào,",
    "dash.title": "Tổng quan dự án",
    "dash.subtitle": "Theo dõi tiến độ và các chỉ số quan trọng trong tháng 07/2026",
    "dash.newReport": "Tạo Báo Cáo Mới",
    "dash.stat.reports": "Báo cáo tháng này",
    "dash.stat.proposals": "Đề xuất đang xử lý",
    "dash.stat.activities": "Hoạt động hoàn thành",
    "dash.stat.issues": "Vấn đề cần hỗ trợ",
    "dash.deadlines": "Deadlines Sắp Tới",
    "dash.quickActions": "Hành động nhanh",
    "dash.action.proposal": "Cập nhật Proposal",
    "dash.action.issue": "Ghi nhận vấn đề (Issue)",
    "dash.action.settings": "Cấu hình Tài khoản",
    "dash.deadline.task1": "Nộp báo cáo quý 2",
    "dash.deadline.task2": "Hoàn thiện Proposal GCF",
    "dash.deadline.task3": "Survey đa dạng sinh học",
    "dash.deadline.site1": "Tay Hoa",
    "dash.deadline.site2": "Toàn dự án",
    "dash.deadline.site3": "Song Hinh",
    "dash.deadline.status1": "Gần đến hạn",
    "dash.deadline.status2": "Đang xử lý",
    "dash.deadline.status3": "Chưa bắt đầu",
    "dash.logout": "Đăng xuất",
    // Form
    "form.title": "Biểu mẫu Báo Cáo Tháng",
    "form.subtitle": "Hệ thống dữ liệu quan hệ (Relational DB) tối ưu",
    "form.step1": "Thông tin chung",
    "form.step2": "Báo cáo Khu vực",
    "form.step3": "Đề xuất & Báo cáo",
    "form.step4": "Thách thức & Ưu tiên",
    "form.step5": "Hoàn tất",
    "form.back": "Quay lại",
    "form.next": "Tiếp tục",
    "form.submit": "Gửi Báo Cáo",
    "form.submitting": "Đang gửi...",
    "form.success.title": "Thành công!",
    "form.success.desc": "Báo cáo đã được ghi nhận vào hệ thống.",
    "form.backDash": "Quay lại Dashboard",
    "form.addSite": "Thêm Site",
    "form.addProposal": "Thêm Đề xuất",
  },
  en: {
    // Login page
    "app.title": "CTNC Report",
    "app.subtitle": "CTNC Project Report Management System",
    "login.userId": "Member ID (User ID)",
    "login.userId.placeholder": "E.g: CTNC-01",
    "login.password": "Password",
    "login.password.placeholder": "••••••••",
    "login.submit": "Sign In",
    "login.loading": "Authenticating...",
    "login.error": "Invalid User ID or password.",
    "login.forgotPassword": "Forgot password?",
    "login.signup": "Create account",
    // Forgot password modal
    "forgot.title": "Forgot Password?",
    "forgot.desc": "Passwords are managed by the CTNC System Administrator. Please contact the Admin to reset your password.",
    "forgot.contact": "Contact Admin",
    "forgot.understood": "Got it",
    // Signup modal
    "signup.title": "Create New Account",
    "signup.desc": "CTNC Report System accounts are issued by the Admin. Users cannot self-register.",
    "signup.request": "Request Account Access",
    "signup.sendEmail": "Send an email to Admin with:",
    "signup.fullName": "Full name",
    "signup.workEmail": "Work email",
    "signup.area": "Area of responsibility",
    "signup.understood": "Got it",
    // Dashboard
    "dash.greeting": "Hello,",
    "dash.title": "Project Overview",
    "dash.subtitle": "Track progress and key metrics for July 2026",
    "dash.newReport": "Create New Report",
    "dash.stat.reports": "Reports this month",
    "dash.stat.proposals": "Proposals in progress",
    "dash.stat.activities": "Activities completed",
    "dash.stat.issues": "Issues needing support",
    "dash.deadlines": "Upcoming Deadlines",
    "dash.quickActions": "Quick Actions",
    "dash.action.proposal": "Update Proposal",
    "dash.action.issue": "Log an Issue",
    "dash.action.settings": "Account Settings",
    "dash.deadline.task1": "Submit Q2 Report",
    "dash.deadline.task2": "Finalize GCF Proposal",
    "dash.deadline.task3": "Biodiversity Survey",
    "dash.deadline.site1": "Tay Hoa",
    "dash.deadline.site2": "All sites",
    "dash.deadline.site3": "Song Hinh",
    "dash.deadline.status1": "Due soon",
    "dash.deadline.status2": "In progress",
    "dash.deadline.status3": "Not started",
    "dash.logout": "Sign Out",
    // Form
    "form.title": "Monthly Report Form",
    "form.subtitle": "Optimized Relational Database structure",
    "form.step1": "General Info",
    "form.step2": "Site Report",
    "form.step3": "Proposals",
    "form.step4": "Challenges & Priorities",
    "form.step5": "Complete",
    "form.back": "Back",
    "form.next": "Continue",
    "form.submit": "Submit Report",
    "form.submitting": "Submitting...",
    "form.success.title": "Success!",
    "form.success.desc": "Your report has been recorded in the system.",
    "form.backDash": "Back to Dashboard",
    "form.addSite": "Add Site",
    "form.addProposal": "Add Proposal",
  },
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("vi");

  useEffect(() => {
    const saved = localStorage.getItem("ctnc-lang") as Language;
    if (saved === "vi" || saved === "en") setLangState(saved);
  }, []);

  const setLang = (l: Language) => {
    setLangState(l);
    localStorage.setItem("ctnc-lang", l);
  };

  const t = (key: string): string => {
    return translations[lang][key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
