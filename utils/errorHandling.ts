export function getVideoExportErrorMessage(error: any): string {
  const message = error?.message || error?.toString() || '';
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('webcodecs')) {
    return 'Trình duyệt của bạn không hỗ trợ WebCodecs. Vui lòng dùng Chrome/Edge mới nhất.';
  }
  
  if (lowerMessage.includes('413') || lowerMessage.includes('too large')) {
    return 'File quá lớn để upload. Vui lòng thử lại với video ngắn hơn.';
  }
  
  if (lowerMessage.includes('fetch') || lowerMessage.includes('network')) {
    return 'Lỗi mạng khi tải video lên. Vui lòng thử lại.';
  }
  
  if (lowerMessage.includes('discord')) {
    return 'Lỗi từ hệ thống Discord. Vui lòng thử lại sau.';
  }

  return `Có lỗi xảy ra trong quá trình tạo/gửi video: ${message || 'Lỗi không xác định'}`;
}
