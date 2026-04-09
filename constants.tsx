
import React from 'react';

export type Language = 'vi' | 'zh' | 'ko' | 'hi';

export const LANGUAGES: { code: Language; name: string; flag: string; locale: string; currency: string; rate: number }[] = [
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳', locale: 'vi-VN', currency: 'VND', rate: 1 },
  { code: 'zh', name: '中文', flag: '🇨🇳', locale: 'zh-CN', currency: 'CNY', rate: 0.00028 },
  { code: 'ko', name: '한국어', flag: '🇰🇷', locale: 'ko-KR', currency: 'KRW', rate: 0.054 },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳', locale: 'hi-IN', currency: 'INR', rate: 0.0033 },
];

export const TRANSLATIONS: Record<Language, any> = {
  vi: {
    booting: ["ĐANG KHỞI TẠO HỆ THỐNG VJP26...", "KIỂM TRA CẤU HÌNH PHẦN CỨNG...", "TỐI ƯU HÓA CƠ SỞ DỮ LIỆU CNC...", "NẠP ĐỘNG CƠ PHÂN TÍCH DXF V3.0...", "HỆ THỐNG SẴN SÀNG."],
    systemTitle: "HỆ THỐNG VJP26",
    secureEngine: "CÔNG NGHỆ CHÍNH XÁC",
    mainSub: "PHÁT TRIỂN SỐ , HƯỚNG ĐẾN TƯƠNG LAI , CƠ BẢN LIỀN TAY",
    calcTab: "MÁY TÍNH CNC",
    dxfTab: "PHÂN TÍCH DXF",
    gcodeTab: "PREVIEW GCODE",
    nestingTab: "NESTING AX",
    customerTitle: "KHÁCH HÀNG",
    customerSelect: "LỰA CHỌN KHÁCH HÀNG",
    customerAdd: "ADD KHÁCH HÀNG",
    customerPlaceholder: "TÊN KHÁCH HÀNG MỚI",
    fileNameLabel: "{ TÊN FILE }",
    fileNamePlaceholder: "Nhập tên file gia công thủ công...",
    settingsTitle: "CẤU HÌNH",
    globalParams: "Thông số gia công",
    platePrice: "Giá gốc (VND)",
    laborPercent: "Phần trăm tiền công",
    inputTitle: "Diện tích đầu vào",
    inputPlaceholder: "Nhập các số cách nhau bởi dấu + hoặc Enter...",
    btnCalc: "TÍNH TOÁN NGAY",
    btnReset: "LÀM MỚI",
    btnExport: "XUẤT DỮ LIỆU (DISCORD)",
    exporting: "ĐANG ĐÓNG GÓI...",
    exportSuccess: "ĐÃ GỬI BÁO CÁO!",
    cardCount: "Số lượng",
    cardBase: "Giá gốc",
    cardLabor: "Tiền công",
    tableTitle: "Chi tiết hạng mục",
    tableRecords: "DÒNG",
    tableStt: "STT",
    tableArea: "DIỆN TÍCH",
    tableTotal: "TỔNG",
    finalTotal: "TỔNG THANH TOÁN",
    authBy: "BỞI VJP26 JACKI",
    footerOnline: "Trạng thái: Hoạt động",
    footerCopyright: "© 2025 VJP26 TRƯƠNG MẠNH HÀ",
    // DXF Specific
    dxfUpload: "NẠP BẢN VẼ DXF",
    dxfParserSub: "Bộ phân tích hình học độ chính xác cao",
    dxfBtnStart: "BẮT ĐẦU PHÂN TÍCH",
    dxfStatusLoading: "Đang tải tệp...",
    dxfStatusParsing: "Đang giải mã thực thể...",
    dxfStatusAnalyzing: "Đang tính toán diện tích...",
    dxfStatusJoining: "Đang tối ưu hóa đường bao...",
    dxfStatusResult: "Hoàn tất phân tích",
    dxfError: "Lỗi: Không thể đọc tệp DXF này",
    dxfAutoJoinInfo: "Hệ thống tự động kết nối các đoạn rời (Join Profile)",
    dxfTotalArea: "TỔNG DIỆN TÍCH FILE",
    dxfCopy: "SAO CHÉP",
    dxfEntityLog: "NHẬT KÝ THỰC THỂ",
    dxfPreview: "XEM TRƯỚC BẢN VẼ",
    dxfSmartJoin: "TỰ ĐỘNG VÁ LỖI (SMART JOIN)",
    dxfJoinTolerance: "Sai số Vá (mm)",
    dxfJoinBtn: "THỰC THI VÁ ĐƯỜNG HỞ",
    // GCODE Specific
    gcodeUpload: "KÉO THẢ HOẶC CHỌN FILE NC/GCODE",
    gcodeSub: "Mô phỏng đường chạy dao 3D Realtime",
    gcodeAnalyzeAI: "PHÂN TÍCH AI (GEMINI)",
    gcodeSimulation: "MÔ PHỎNG",
    gcodeEditor: "BỘ SOẠN THẢO",
    gcodeInfo: "THÔNG SỐ CẮT",
    // Nesting Specific
    nestingSheetSize: "KÍCH THƯỚC PHÔI",
    nestingGap: "KHOẢNG CÁCH (GAP)",
    nestingAddPart: "THÊM CHI TIẾT",
    nestingPartName: "Tên chi tiết",
    nestingDimensions: "Dài x Rộng (mm)",
    nestingQty: "SL",
    nestingExecute: "CHẠY NESTING",
    nestingResult: "KẾT QUẢ TỐI ƯU",
    nestingEfficiency: "HIỆU SUẤT",
    nestingUnplaced: "KHÔNG VỪA",
    nestingParams: "THÔNG SỐ NESTING",
    nestingParts: "DANH SÁCH CHI TIẾT",
    nestingStatus: "TRẠNG THÁI",
    nestingStrategy: "CHIẾN LƯỢC XẾP",
    nestingRotation: "CHO PHÉP XOAY",
    nestingStop: "DỪNG TÍNH TOÁN",
    nestingReset: "RESET LAYOUT",
    nestingMousePan: "Chuột giữa: Pan",
    nestingMouseZoom: "Con lăn: Zoom",
    nestingMouseSelect: "Chuột trái: Chọn/Kéo",
    // Discord Mapping
    discordReportTitle: "📄 PHIẾU BÁO GIÁ CHI TIẾT",
    discordRecipient: "Người nhận",
    discordTotalLabel: "💰 TỔNG CỘNG :",
    discordStatsLabel: "📊 Thống kê :",
    discordFileLabel: "FILE:",
    discordLaborLabel: "Tiền Công:",
    discordDetailsLabel: "📝 Chi tiết Tổng Diện Tích :",
    discordAreaPrefix: "AREA=",
    discordOwner: "Trực Thuộc Sở Hữu Và Phát Triển Bởi TRƯƠNG MẠNH HÀ"
  },
  zh: {
    booting: ["正在初始化 VJP26 系统...", "系统就绪。"],
    systemTitle: "VJP26 系统",
    calcTab: "CNC 计算器",
    dxfTab: "DXF 分析",
    gcodeTab: "GCODE 预览",
    nestingTab: "NESTING AX",
    dxfPreview: "图纸预览"
  },
  ko: {
    booting: ["VJP26 시스템 초기화 중...", "준비 완료."],
    systemTitle: "VJP26 시스템",
    calcTab: "CNC 계산기",
    dxfTab: "DXF 분석",
    gcodeTab: "GCODE 미리보기",
    nestingTab: "NESTING AX",
    dxfPreview: "도면 미리보기"
  },
  hi: {
    booting: ["VJP26 시스템 शुरू हो रहा है...", "सिस्टम तैयार।"],
    systemTitle: "VJP26 시스템",
    calcTab: "CNC कैलकुलेटर",
    dxfTab: "DXF विश्लेषण",
    gcodeTab: "GCODE पूर्वावलोकन",
    nestingTab: "NESTING AX",
    dxfPreview: "चित्र पूर्वावलोकन"
  }
};

export const FORMAT_CURRENCY = (value: number, lang: Language = 'vi') => {
  const langConfig = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];
  const convertedValue = value * langConfig.rate;
  return new Intl.NumberFormat(langConfig.locale, {
    style: 'currency',
    currency: langConfig.currency,
    minimumFractionDigits: lang === 'vi' ? 0 : 2,
    maximumFractionDigits: 2
  }).format(convertedValue);
};

export const FORMAT_NUMBER = (value: number, lang: Language = 'vi') => {
  const langConfig = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];
  return new Intl.NumberFormat(langConfig.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(value);
};
