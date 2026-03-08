export function getVideoExportErrorMessage(error: any): string {
  const message = error?.message || error?.toString() || '';
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('webcodecs')) {
    return 'Trình duyệt của bạn không hỗ trợ WebCodecs. Vui lòng dùng Chrome/Edge mới nhất.';
  }
  
  if (lowerMessage.includes('413') || lowerMessage.includes('lớn')) {
    return 'Video tạo ra quá lớn (vượt quá 7.5MB). Vui lòng giảm thời gian video.';
  }
  
  if (lowerMessage.includes('fetch') || lowerMessage.includes('network')) {
    return 'Lỗi mạng khi tải video lên. Vui lòng thử lại.';
  }
  
  if (lowerMessage.includes('discord')) {
    return 'Lỗi từ hệ thống Discord. Vui lòng thử lại sau.';
  }

  return `Có lỗi xảy ra trong quá trình tạo/gửi video: ${message || 'Lỗi không xác định'}`;
}
