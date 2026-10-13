# Lumi Ledger — Visual-First Expense Tracker PWA

Website PWA (Progressive Web App) quản lý thu chi bằng **hình ảnh**, thiết kế ưu tiên iPhone. Không yêu cầu Flutter, Xcode, Node.js, hay dịch vụ backend; chỉ có HTML/CSS/JavaScript.

## Tính năng

- Tạo giao dịch **bằng camera hoặc thư viện ảnh**; có ảnh mới lưu được giao dịch.
- Nhập số tiền VNĐ, Thu/Chi, danh mục, ngày giờ, ghi chú.
- Ảnh được nén và tạo thumbnail ngay trên thiết bị.
- Lưu giao dịch + ảnh bằng **IndexedDB** (trên thiết bị, không truyền lên máy chủ).
- Nhật ký ảnh dạng Timeline hoặc Grid; tìm kiếm, xem chi tiết, chỉnh sửa, xóa.
- Tổng Thu/Chi/Chênh lệch tháng hiện tại.
- Biểu đồ danh mục chi tiêu và bộ lọc Tuần, Tháng, Năm, Tùy chọn.
- Xuất bản sao lưu JSON **kèm toàn bộ ảnh**, phục hồi/gộp dữ liệu.
- Manifest, icon iOS, Service Worker để có thể **Add to Home Screen** và dùng offline sau lần tải đầu.

**Chưa có OCR**: Phiên bản website này chưa có nhận dạng chữ trong hóa đơn. OCR bằng thư viện chạy trên máy có thể bổ sung sau, cần tải mô hình OCR và kiểm tra kỹ khả năng dùng offline. **iOS PWA** không bảo đảm hỗ trợ phím tắt khi nhấn giữ icon như ứng dụng iOS native, dù manifest đã có shortcut cho trình duyệt hỗ trợ.

## Xem thử trên Windows

**Cách dễ nhất:** mở thư mục `LumiLedger_PWA` trong VS Code, cài extension **Live Server**, rồi chọn **Go Live**. Mở địa chỉ hiện ra trong trình duyệt để sử dụng. Hoặc nếu có Python:

```bash
python -m http.server 8000
```

Sau đó truy cập `http://localhost:8000`.

**Không mở file `index.html` bằng double-click (`file://`)** vì Service Worker/offline không hoạt động trên `file://`, và IndexedDB có thể hoạt động không nhất quán.

## Đưa website lên GitHub Pages MIỄN PHÍ

1. Đăng nhập https://github.com → dấu `+` → **New repository**. Đặt tên `lumi-ledger`, chọn **Public**, nhấn **Create repository**. GitHub Pages miễn phí với public repository phù hợp cho website tĩnh này.
2. Giải nén ZIP; mở VS Code trong **thư mục `LumiLedger_PWA`** (nơi có `index.html`, `styles.css`, `js/`, `icons/`).
3. Mở Terminal tại thư mục này, chạy lần lượt (cần cài Git trước):

```bash
git init
git add .
git commit -m "Create Lumi Ledger PWA"
git branch -M main
git remote add origin https://github.com/TEN_TAI_KHOAN/lumi-ledger.git
git push -u origin main
```

Thay `TEN_TAI_KHOAN` bằng tên người dùng GitHub của bạn. GitHub có thể yêu cầu đăng nhập/xác thực qua trình duyệt hoặc Git Credential Manager.

4. Trong repository chọn **Settings → Pages → Build and deployment → Deploy from a branch** → branch `main`, folder `/(root)` → **Save**.
5. Sau khi GitHub Pages triển khai xong, website thường có địa chỉ theo dạng:
   `https://TEN_TAI_KHOAN.github.io/lumi-ledger/`

**Địa chỉ trên chỉ là cấu trúc ví dụ, KHÔNG phải website đã được xuất bản.** Cần đợi GitHub Pages tạo URL thật. Tất cả đường dẫn trong website đều tương đối, nên chạy được với GitHub Pages project site.

## Thêm lên Màn hình chính iPhone

1. Dùng **Safari** trên iPhone mở URL HTTPS từ GitHub Pages.
2. Chạm **Chia sẻ** (biểu tượng ô vuông/mũi tên) → **Thêm vào Màn hình chính** (*Add to Home Screen*).
3. Nếu có, bật **Mở dưới dạng ứng dụng web** (*Open as Web App*) → **Thêm**.
4. Mở icon `Lumi Ledger` trên Màn hình chính. Sau lần mở đầu tiên tải đầy đủ thành công, những lần sau có thể mở không cần mạng.

**Lưu ý quan trọng về dữ liệu:** Dữ liệu nằm trong IndexedDB của website/PWA trên từng thiết bị; không tự đồng bộ iPhone ↔ máy tính. Safari/iOS có thể xóa dữ liệu website trong một số tình huống (thiếu dung lượng, xóa website data, gỡ ứng dụng...). Hãy vào **Cài đặt → Xuất bản sao lưu** thường xuyên; lưu JSON vào Tệp/iCloud Drive và thử tính năng khôi phục. Không đăng nhập vào một trang khác để mong lấy lại dữ liệu.

## Thư mục

```text
LumiLedger_PWA/
├─ index.html                 Giao diện chính
├─ styles.css                 Thiết kế responsive / iPhone safe-area
├─ js/
│  ├─ app.js                  UI + nghiệp vụ giao dịch + biểu đồ + backup
│  └─ db.js                   IndexedDB CRUD
├─ icons/
│  ├─ icon-192.png            PWA icon
│  ├─ icon-512.png            PWA icon
│  └─ apple-touch-icon.png    iOS icon
├─ manifest.webmanifest       Metadata cài ứng dụng
├─ sw.js                      Cache offline
└─ README.md
```

## Quyền riêng tư, giới hạn

- Website không chứa analytics/tracker và không có request API bên ngoài.
- Mọi dữ liệu giao dịch và ảnh nằm trong bộ nhớ trình duyệt. Xuất bản sao lưu qua file JSON do bạn chủ động tải xuống.
- Nếu host bằng GitHub Pages, **mã nguồn website là công khai**, nhưng ảnh/giao dịch của người dùng không nằm trong repository và không được tải lên GitHub khi sử dụng app.
- Camera API sử dụng `<input type="file" accept="image/*" capture="environment">`; iOS có thể hiển thị hộp thoại camera/thư viện tùy phiên bản Safari.
- Nén JPEG tối đa cạnh dài 1800px và thumbnail 540px; một số hóa đơn có chữ nhỏ cần chụp ảnh rõ để giữ khả năng đọc.
- Cần website chạy trên **HTTPS** (hoặc localhost) để Service Worker hoạt động.
