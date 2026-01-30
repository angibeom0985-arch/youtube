from PIL import Image, ImageDraw, ImageFont
import os

def create_og_image():
    """메인 OG 이미지 생성 - 링크 공유 시 표시되는 이미지"""
    
    # 1200x630 표준 OG 이미지 크기
    width, height = 1200, 630
    
    # 그라데이션 배경 생성 (빨강 -> 주황)
    img = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(img)
    
    # 배경 그라데이션
    for y in range(height):
        # 빨강(#FF0000)에서 어두운 빨강(#8B0000)으로
        r = int(255 - (y / height) * 116)
        g = int(0)
        b = int(0)
        draw.rectangle([(0, y), (width, y+1)], fill=(r, g, b))
    
    # 반투명 오버레이 (좀 깔끔한 느낌)
    overlay = Image.new('RGBA', (width, height), (0, 0, 0, 100))
    img.paste(overlay, (0, 0), overlay)
    
    # 기본 폰트 로드 (Windows 시스템 폰트)
    try:
        # 나눔고딕 사용
        title_font = ImageFont.truetype("C:/Windows/Fonts/NanumGothic.ttf", 80)
        subtitle_font = ImageFont.truetype("C:/Windows/Fonts/NanumGothic.ttf", 45)
        desc_font = ImageFont.truetype("C:/Windows/Fonts/NanumGothic.ttf", 32)
    except Exception as e:
        print(f"⚠️ Font loading error: {e}")
        try:
            # Hancom Gothic 시도
            title_font = ImageFont.truetype("C:/Windows/Fonts/Hancom Gothic Regular.ttf", 80)
            subtitle_font = ImageFont.truetype("C:/Windows/Fonts/Hancom Gothic Regular.ttf", 45)
            desc_font = ImageFont.truetype("C:/Windows/Fonts/Hancom Gothic Regular.ttf", 32)
        except:
            try:
                # 굴림 시도
                title_font = ImageFont.truetype("C:/Windows/Fonts/GOTHIC.TTF", 80)
                subtitle_font = ImageFont.truetype("C:/Windows/Fonts/GOTHIC.TTF", 45)
                desc_font = ImageFont.truetype("C:/Windows/Fonts/GOTHIC.TTF", 32)
            except:
                # 모두 실패 시 기본 폰트
                print("⚠️ All fonts failed, using default")
                title_font = ImageFont.load_default()
                subtitle_font = ImageFont.load_default()
                desc_font = ImageFont.load_default()
    
    # 텍스트 그리기
    # 메인 타이틀
    title = "유튜브 영상 분석 AI"
    title_bbox = draw.textbbox((0, 0), title, font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    title_x = (width - title_width) // 2
    
    # 타이틀 그림자
    draw.text((title_x + 4, 154), title, fill=(0, 0, 0), font=title_font)
    # 타이틀 본문 (흰색)
    draw.text((title_x, 150), title, fill=(255, 255, 255), font=title_font)
    
    # 서브타이틀
    subtitle = "영상 분석을 1분만에"
    subtitle_bbox = draw.textbbox((0, 0), subtitle, font=subtitle_font)
    subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
    subtitle_x = (width - subtitle_width) // 2
    draw.text((subtitle_x + 3, 263), subtitle, fill=(0, 0, 0), font=subtitle_font)
    draw.text((subtitle_x, 260), subtitle, fill=(255, 255, 100), font=subtitle_font)
    
    # 하단 설명
    desc = "AI가 분석하는 성공 공식 | 완전 무료"
    desc_bbox = draw.textbbox((0, 0), desc, font=desc_font)
    desc_width = desc_bbox[2] - desc_bbox[0]
    desc_x = (width - desc_width) // 2
    draw.text((desc_x + 2, 352), desc, fill=(0, 0, 0), font=desc_font)
    draw.text((desc_x, 350), desc, fill=(255, 200, 200), font=desc_font)
    
    # 아이콘들 (이모지 사용)
    icons_text = "📺 📈 🤖 🎯"
    icons_bbox = draw.textbbox((0, 0), icons_text, font=subtitle_font)
    icons_width = icons_bbox[2] - icons_bbox[0]
    icons_x = (width - icons_width) // 2
    draw.text((icons_x, 450), icons_text, fill=(255, 255, 255), font=subtitle_font)
    
    # URL
    url = "youtube.money-hotissue.com"
    url_bbox = draw.textbbox((0, 0), url, font=desc_font)
    url_width = url_bbox[2] - url_bbox[0]
    url_x = (width - url_width) // 2
    
    # URL 배경 박스
    padding = 15
    draw.rectangle(
        [(url_x - padding, 540 - padding), (url_x + url_width + padding, 540 + 40 + padding)],
        fill=(255, 255, 255, 200)
    )
    draw.text((url_x, 540), url, fill=(139, 0, 0), font=desc_font)
    
    # 저장
    img.save('public/og-image.png', 'PNG', quality=95)
    print("✅ og-image.png created!")

def create_guide_og_image():
    """사용법 가이드 페이지 OG 이미지"""
    width, height = 1200, 630
    img = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(img)
    
    # 파란색 그라데이션
    for y in range(height):
        r = int(30 + (y / height) * 30)
        g = int(100 + (y / height) * 50)
        b = int(200 - (y / height) * 50)
        draw.rectangle([(0, y), (width, y+1)], fill=(r, g, b))
    
    try:
        title_font = ImageFont.truetype("C:/Windows/Fonts/NanumGothic.ttf", 70)
        subtitle_font = ImageFont.truetype("C:/Windows/Fonts/NanumGothic.ttf", 40)
    except:
        try:
            title_font = ImageFont.truetype("C:/Windows/Fonts/GOTHIC.TTF", 70)
            subtitle_font = ImageFont.truetype("C:/Windows/Fonts/GOTHIC.TTF", 40)
        except:
            title_font = ImageFont.load_default()
            subtitle_font = ImageFont.load_default()
    
    title = "사용 방법 가이드"
    title_bbox = draw.textbbox((0, 0), title, font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    title_x = (width - title_width) // 2
    draw.text((title_x + 3, 203), title, fill=(0, 0, 0), font=title_font)
    draw.text((title_x, 200), title, fill=(255, 255, 255), font=title_font)
    
    subtitle = "30초만에 시작하는 영상 분석"
    subtitle_bbox = draw.textbbox((0, 0), subtitle, font=subtitle_font)
    subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
    subtitle_x = (width - subtitle_width) // 2
    draw.text((subtitle_x, 320), subtitle, fill=(200, 255, 200), font=subtitle_font)
    
    img.save('public/og-image-guide.png', 'PNG', quality=95)
    print("✅ og-image-guide.png created!")

def create_api_guide_og_image():
    """API 키 발급 가이드 페이지 OG 이미지"""
    width, height = 1200, 630
    img = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(img)
    
    # 보라색 그라데이션
    for y in range(height):
        r = int(138 - (y / height) * 50)
        g = int(43 - (y / height) * 20)
        b = int(226 - (y / height) * 80)
        draw.rectangle([(0, y), (width, y+1)], fill=(r, g, b))
    
    try:
        title_font = ImageFont.truetype("C:/Windows/Fonts/NanumGothic.ttf", 70)
        subtitle_font = ImageFont.truetype("C:/Windows/Fonts/NanumGothic.ttf", 40)
    except:
        try:
            title_font = ImageFont.truetype("C:/Windows/Fonts/GOTHIC.TTF", 70)
            subtitle_font = ImageFont.truetype("C:/Windows/Fonts/GOTHIC.TTF", 40)
        except:
            title_font = ImageFont.load_default()
            subtitle_font = ImageFont.load_default()
    
    title = "API 키 발급 가이드"
    title_bbox = draw.textbbox((0, 0), title, font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    title_x = (width - title_width) // 2
    draw.text((title_x + 3, 203), title, fill=(0, 0, 0), font=title_font)
    draw.text((title_x, 200), title, fill=(255, 255, 255), font=title_font)
    
    subtitle = "무료 Google Gemini API 설정"
    subtitle_bbox = draw.textbbox((0, 0), subtitle, font=subtitle_font)
    subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
    subtitle_x = (width - subtitle_width) // 2
    draw.text((subtitle_x, 320), subtitle, fill=(255, 255, 150), font=subtitle_font)
    
    img.save('public/og-image-api-guide.png', 'PNG', quality=95)
    print("✅ og-image-api-guide.png created!")

if __name__ == "__main__":
    print("🚀 Creating OG images...")
    create_og_image()
    create_guide_og_image()
    create_api_guide_og_image()
    print("✅ All OG images created successfully!")
