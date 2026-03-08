# Re-implement iOS ChatBot UI (Properly Sized)

## Context
User wants the iOS layout from `code.html`, but last time I made it full screen or retained the "mockup" outer background which ruined the floating widget behavior.
User specifically said: "cần phải loại bỏ phần đen dư thừa bên ngoài và chỉnh lại kích thước thành kích thước con iphone 5 sau đó mới thay thế vào cái giao diện khung chat hiện tại"
(Remove the excess black background outside, resize exactly to iPhone 5, then replace the current chat frame UI).

## Execution Plan
1. Edit `components/ChatBot.tsx`.
2. The outer wrapper for the opened chat MUST be:
   `className="relative w-[320px] h-[568px] bg-[#000000] flex flex-col overflow-hidden shadow-2xl rounded-2xl border border-white/10 mb-4"`
   (This replaces the `h-screen max-w-[430px]` from the HTML, and removes the `body` wrappers).
3. Keep the toggle `isOpen` logic and the Floating Action Button.
4. Replace the `MatrixRain` and terminal styles with the iOS UI code (Top Nav, Chat Area, Bottom Input).
5. Add the necessary CSS into a `<style>` tag inside the component.
