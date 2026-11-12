# YÊU CẦU — MINI GAME "ĐẬP LỢN"

## 1. Tổng quan

Mini game chạy trên trình duyệt (web, HTML/CSS/JS), chơi bằng chuột/cảm ứng. Người chơi có **30 giây** để bấm trúng các con lợn xuất hiện ngẫu nhiên trên lưới **3×3 ô**. Mỗi lần bấm trúng được **1 điểm**. Mục tiêu: ghi được điểm số càng cao càng tốt trước khi hết giờ.

---

## 2. Luật chơi

1. Bàn chơi là một lưới gồm **3×3 = 9 ô** (hang/hố).
2. Tại mỗi thời điểm, hệ thống chọn **ngẫu nhiên 1 hoặc nhiều ô** để "lợn" xuất hiện (nhô lên) trong một khoảng thời gian ngắn, sau đó lợn tự thu về (biến mất) nếu không bị đập.
3. Người chơi bấm (click/tap) vào ô đang có lợn để "đập" lợn.
   - Bấm **đúng lúc lợn đang hiện** → đập trúng, được điểm.
   - Bấm vào ô **trống** (không có lợn) → không được điểm, không bị trừ điểm (phạm vi bản đầu tiên — có thể bổ sung luật phạt ở phiên bản sau, xem mục 6).
   - Bấm vào lợn đã bị đập trúng trước đó (lợn đã biến mất) → không tính.
4. Thời gian mỗi lượt chơi là **30 giây**, tính từ khi người chơi bấm **"Bắt đầu"**.
5. Khi hết 30 giây, trò chơi **dừng ngay lập tức**:
   - Lợn đang hiện trên lưới biến mất hết.
   - Không còn ô nào phản hồi click nữa.
6. Sau khi hết giờ, hệ thống hiển thị **màn hình kết quả** với điểm số cuối cùng.
7. Người chơi có thể bấm **"Chơi lại"** để bắt đầu một lượt mới (điểm số và thời gian được reset về 0 và 30 giây).

### Tốc độ xuất hiện của lợn (gợi ý, có thể điều chỉnh khi cài đặt độ khó)
- Lợn xuất hiện lặp lại liên tục trong suốt 30 giây, không có "khoảng chờ" giữa các lượt game.
- Mỗi lần xuất hiện, lợn hiện trong khoảng **0.6 – 1 giây** rồi tự thu về nếu không bị đập.
- Khoảng cách giữa 2 lần xuất hiện liên tiếp: khoảng **0.3 – 0.8 giây** (ngẫu nhiên), để tạo cảm giác hồi hộp, bất ngờ.
- Có thể xuất hiện đồng thời ở nhiều ô cùng lúc (tối đa gợi ý: 1–2 ô cùng lúc) để tăng độ khó.
- Lợn không xuất hiện 2 lần liên tiếp tại đúng cùng một ô (tránh gây cảm giác máy móc, lặp lại).

---

## 3. Cách tính điểm

- **Đập trúng 1 lợn = +1 điểm.**
- Không có điểm trừ, không có điểm thưởng/combo trong phiên bản cơ bản.
- Điểm số được cập nhật **tức thì** ngay khi đập trúng (hiển thị trực tiếp trên màn hình chơi, không cần chờ hết giờ).
- Điểm số tối đa không giới hạn — phụ thuộc vào phản xạ của người chơi và số lần lợn xuất hiện trong 30 giây.
- Điểm số cuối lượt = tổng số lần đập trúng trong suốt 30 giây, hiển thị tại màn hình kết quả.

---

## 4. Các màn hình (Screens)

### 4.1. Màn hình bắt đầu (Start Screen)
- Tiêu đề game (ví dụ: "Đập Lợn").
- Hướng dẫn chơi ngắn gọn (1–2 câu): "Bấm vào lợn khi nó xuất hiện. Bạn có 30 giây!"
- Nút **"Bắt đầu"** để khởi động lượt chơi.
- (Tuỳ chọn) Hiển thị điểm cao nhất (high score) đã lưu trước đó, nếu có.

### 4.2. Màn hình chơi (Gameplay Screen)
- Lưới 3×3 ô, mỗi ô là một "hang" lợn có thể ẩn/hiện.
- Thanh hiển thị **điểm số hiện tại** (góc trên, cập nhật realtime).
- Thanh/đồng hồ hiển thị **thời gian còn lại** (đếm ngược từ 30 → 0 giây), có thể dùng số đếm hoặc progress bar.
- Hiệu ứng khi đập trúng lợn (ví dụ: lợn "biến mất"/nhăn mặt, âm thanh "hự", rung nhẹ ô — không bắt buộc nhưng nên có để tăng trải nghiệm).
- Khi đồng hồ chạm 0, chuyển sang màn hình kết quả.

### 4.3. Màn hình kết quả (Result Screen)
- Thông báo "Hết giờ!" / "Kết thúc lượt chơi".
- Hiển thị **điểm số cuối cùng** của lượt chơi vừa kết thúc.
- Hiển thị **điểm cao nhất** (high score) nếu điểm vừa đạt được cao hơn các lượt trước (và lưu lại).
- Nút **"Chơi lại"** để bắt đầu lượt chơi mới (quay về trạng thái ban đầu của màn hình chơi, reset điểm và thời gian).
- (Tuỳ chọn) Nút **"Về màn hình chính"** để quay lại Start Screen.

---

## 5. Tiêu chí hoàn thành (Definition of Done)

Game được coi là hoàn thành khi đáp ứng đủ các tiêu chí sau:

1. **Lưới 3×3** hiển thị đúng 9 ô, bố cục rõ ràng, không bị vỡ layout trên các kích thước màn hình phổ biến (desktop, tablet, mobile — responsive cơ bản).
2. **Lợn xuất hiện ngẫu nhiên** tại các ô khác nhau trong suốt thời gian chơi, không bị lặp cố định theo một chu kỳ dễ đoán.
3. **Bấm trúng ô đang có lợn** → điểm tăng đúng +1, cập nhật hiển thị ngay lập tức.
4. **Bấm vào ô trống hoặc lợn đã biến mất** → không cộng điểm, không gây lỗi (crash, điểm âm, điểm nhảy sai).
5. **Đồng hồ đếm ngược 30 giây hoạt động chính xác**, không bị lệch, dừng đúng lúc 0 giây.
6. **Khi hết giờ**: toàn bộ lợn biến mất, mọi tương tác với lưới bị khoá (click không còn tác dụng), tự động chuyển sang màn hình kết quả.
7. **Màn hình kết quả hiển thị đúng điểm số** của lượt chơi vừa kết thúc.
8. **Nút "Chơi lại" hoạt động đúng**: reset điểm về 0, reset thời gian về 30 giây, lưới trở lại trạng thái ban đầu (không còn lợn nào hiện), và có thể chơi lại nhiều lượt liên tiếp không bị lỗi tích lũy (điểm/thời gian của lượt trước không ảnh hưởng lượt sau).
9. Game chạy ổn định trên các trình duyệt phổ biến (Chrome, Edge, Firefox) — không có lỗi console nghiêm trọng.
10. Trải nghiệm chơi mượt mà: lợn xuất hiện/biến mất không bị giật, click được ghi nhận đúng ô, không có hiện tượng "click xuyên" sang ô khác.
11. (Nếu có yêu cầu) Điểm cao nhất (high score) được lưu lại giữa các lượt chơi trong cùng một phiên trình duyệt (ví dụ dùng `localStorage`), và hiển thị đúng ở màn hình bắt đầu/kết quả.

---

## 6. Phạm vi và giới hạn (Out of scope — cho phiên bản này)

Các mục dưới đây **không** nằm trong phạm vi yêu cầu hiện tại, chỉ ghi chú để tham khảo cho các phiên bản mở rộng sau:

- Không có nhiều cấp độ khó (easy/medium/hard).
- Không có hệ thống trừ điểm khi bấm sai hoặc bấm hụt.
- Không có combo/điểm thưởng theo chuỗi đập trúng liên tiếp.
- Không có âm thanh/nhạc nền bắt buộc (có thể thêm nếu muốn nhưng không phải tiêu chí hoàn thành).
- Không có xếp hạng (leaderboard) online, chỉ lưu high score cục bộ (local).
- Không có chế độ nhiều người chơi (multiplayer).

---

*Tài liệu này mô tả yêu cầu chức năng — chưa bao gồm code triển khai.*
