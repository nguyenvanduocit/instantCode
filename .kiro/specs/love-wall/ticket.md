là user, tôi muốn có một trang để hiển thị các lời nhắn,lời cảm ơn (@/Volumes/Data/Projects/instantcode/app/.kiro/specs/love-wall/screen.png), và cũng có một modal để bất kỳ ai cũng có thể submit các lời cảm hơn này (@/Volumes/Data/Projects/instantcode/app/.kiro/specs/love-wall/add-modal.png).

Tôi sẽ gọi nó là LoveWallView. Tại view này, luôn có một footer với possition là fixed, nó sẽ có background mờ dần về phía trên, và luôn hiển thị, nhờ vậy user sẽ có thể bấm vào nút gửi lời nhắn bất cứ lúc nào.

Sử dụng supabase để tạo một table chứa các lời nhắn này, bất kỳ ai cũng có thể list và create, nhưng không ai có thể edit hoặc xóa cả. 

## Kỹ thuật.

Hãy tìm hiểu codebase để biết cách sử dụng  store, firebase, có thể sử dụng supabase mcp để có thể tạo một số sample data