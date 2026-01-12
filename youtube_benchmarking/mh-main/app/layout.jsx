export const metadata = {
  title: "모멘텀 헌터",
  description: "강한 모멘텀 신호를 가진 유튜브 영상을 찾아줍니다."
};

import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
