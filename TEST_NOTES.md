# Kết quả kiểm tra phiên bản PWA

- JavaScript `app.js`, `db.js`, `sw.js`: đạt kiểm tra cú pháp `node --check`.
- Giao diện được kiểm tra bằng Chromium DOM harness với bộ dữ liệu *mô phỏng*:
  - Xem trang chủ/trạng thái rỗng.
  - Chọn ảnh, nén ảnh, thêm giao dịch.
  - Xem dạng Grid/Timeline, xem chi tiết, sửa, xóa.
  - Tổng thu/chi và biểu đồ theo danh mục.
  - Chọn các bộ lọc thời gian.
  - Sao lưu JSON có ảnh, nhập lại sao lưu.
- Chưa thể kiểm tra trực tiếp GitHub Pages/Safari iOS hoặc thử chu trình HTTP+Service Worker offline đầy đủ trong môi trường build do môi trường chặn điều hướng mạng cục bộ bằng Chromium. Kiểm tra thực tế trên Safari iPhone sau khi xuất bản HTTPS vẫn cần thực hiện.
- OCR chưa triển khai; PWA shortcut khi nhấn giữ icon phụ thuộc hỗ trợ của iOS (không được bảo đảm).
