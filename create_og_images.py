from PIL import Image, ImageDraw, ImageFont
import os

def create_og_image():
    """ë©”ì¸ OG ?´ë?ì§€ ?ì„± - ë§í¬ ê³µìœ  ???œì‹œ???€???´ë?ì§€"""
    
    # 1200x630 ?œì? OG ?´ë?ì§€ ?¬ê¸°
    width, height = 1200, 630
    
    # ê·¸ë¼?°ì´??ë°°ê²½ ?ì„± (ë¹¨ê°• -> ì£¼í™©)
    img = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(img)
    
    # ë°°ê²½ ê·¸ë¼?°ì´??
    for y in range(height):
        # ë¹¨ê°•(#FF0000)?ì„œ ?´ë‘??ë¹¨ê°•(#8B0000)?¼ë¡œ
        r = int(255 - (y / height) * 116)
        g = int(0)
        b = int(0)
        draw.rectangle([(0, y), (width, y+1)], fill=(r, g, b))
    
    # ë°˜íˆ¬ëª??¤ë²„?ˆì´ (??ê¹”ë”???ë‚Œ)
    overlay = Image.new('RGBA', (width, height), (0, 0, 0, 100))
    img.paste(overlay, (0, 0), overlay)
    
    # ?œê? ?°íŠ¸ ë¡œë“œ (Windows ?œìŠ¤???°íŠ¸)
    try:
        # ?˜ëˆ”ê³ ë”• ?¬ìš©
        title_font = ImageFont.truetype("C:/Windows/Fonts/NanumGothic.ttf", 80)
        subtitle_font = ImageFont.truetype("C:/Windows/Fonts/NanumGothic.ttf", 45)
        desc_font = ImageFont.truetype("C:/Windows/Fonts/NanumGothic.ttf", 32)
    except Exception as e:
        print(f"? ï¸ Font loading error: {e}")
        try:
            # Hancom Gothic ?œë„
            title_font = ImageFont.truetype("C:/Windows/Fonts/Hancom Gothic Regular.ttf", 80)
            subtitle_font = ImageFont.truetype("C:/Windows/Fonts/Hancom Gothic Regular.ttf", 45)
            desc_font = ImageFont.truetype("C:/Windows/Fonts/Hancom Gothic Regular.ttf", 32)
        except:
            try:
                # êµ´ë¦¼ ?œë„
                title_font = ImageFont.truetype("C:/Windows/Fonts/GOTHIC.TTF", 80)
                subtitle_font = ImageFont.truetype("C:/Windows/Fonts/GOTHIC.TTF", 45)
                desc_font = ImageFont.truetype("C:/Windows/Fonts/GOTHIC.TTF", 32)
            except:
                # ëª¨ë‘ ?¤íŒ¨ ??ê¸°ë³¸ ?°íŠ¸
                print("??All fonts failed, using default")
                title_font = ImageFont.load_default()
                subtitle_font = ImageFont.load_default()
                desc_font = ImageFont.load_default()
    
    # ?ìŠ¤??ê·¸ë¦¬ê¸?
    # ë©”ì¸ ?€?´í?
    title = "? íŠœë¸??ìƒ ë¶„ì„ AI"
    title_bbox = draw.textbbox((0, 0), title, font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    title_x = (width - title_width) // 2
    
    # ?€?´í? ê·¸ë¦¼??
    draw.text((title_x + 4, 154), title, fill=(0, 0, 0), font=title_font)
    # ?€?´í? ë³¸ë¬¸ (?°ìƒ‰)
    draw.text((title_x, 150), title, fill=(255, 255, 255), font=title_font)
    
    # ?œë¸Œ?€?´í?
    subtitle = "?¡ìƒ ?ìƒ??ë¹„ë???1ë¶?ë§Œì—"
    subtitle_bbox = draw.textbbox((0, 0), subtitle, font=subtitle_font)
    subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
    subtitle_x = (width - subtitle_width) // 2
    draw.text((subtitle_x + 3, 263), subtitle, fill=(0, 0, 0), font=subtitle_font)
    draw.text((subtitle_x, 260), subtitle, fill=(255, 255, 100), font=subtitle_font)
    
    # ?˜ë‹¨ ?¤ëª…
    desc = "AIê°€ ë¶„ì„???±ê³µ ê³µì‹ | ?„ì „ ë¬´ë£Œ"
    desc_bbox = draw.textbbox((0, 0), desc, font=desc_font)
    desc_width = desc_bbox[2] - desc_bbox[0]
    desc_x = (width - desc_width) // 2
    draw.text((desc_x + 2, 352), desc, fill=(0, 0, 0), font=desc_font)
    draw.text((desc_x, 350), desc, fill=(255, 200, 200), font=desc_font)
    
    # ?„ì´ì½˜ë“¤ (?´ëª¨ì§€ ?¤í???
    icons_text = "?¬ ?“Š ?’¡ ??"
    icons_bbox = draw.textbbox((0, 0), icons_text, font=subtitle_font)
    icons_width = icons_bbox[2] - icons_bbox[0]
    icons_x = (width - icons_width) // 2
    draw.text((icons_x, 450), icons_text, fill=(255, 255, 255), font=subtitle_font)
    
    # URL
    url = "youtube.money-hotissue.com"
    url_bbox = draw.textbbox((0, 0), url, font=desc_font)
    url_width = url_bbox[2] - url_bbox[0]
    url_x = (width - url_width) // 2
    
    # URL ë°°ê²½ ë°•ìŠ¤
    padding = 15
    draw.rectangle(
        [(url_x - padding, 540 - padding), (url_x + url_width + padding, 540 + 40 + padding)],
        fill=(255, 255, 255, 200)
    )
    draw.text((url_x, 540), url, fill=(139, 0, 0), font=desc_font)
    
    # ?€??
    img.save('public/og-image.png', 'PNG', quality=95)
    print("??og-image.png created!")

def create_guide_og_image():
    """?¬ìš©ë²?ê°€?´ë“œ ?˜ì´ì§€ OG ?´ë?ì§€"""
    width, height = 1200, 630
    img = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(img)
    
    # ?Œë???ê·¸ë¼?°ì´??
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
    
    title = "?¬ìš© ë°©ë²• ê°€?´ë“œ"
    title_bbox = draw.textbbox((0, 0), title, font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    title_x = (width - title_width) // 2
    draw.text((title_x + 3, 203), title, fill=(0, 0, 0), font=title_font)
    draw.text((title_x, 200), title, fill=(255, 255, 255), font=title_font)
    
    subtitle = "30ì´?ë§Œì— ?œì‘?˜ëŠ” ?ìƒ ë¶„ì„"
    subtitle_bbox = draw.textbbox((0, 0), subtitle, font=subtitle_font)
    subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
    subtitle_x = (width - subtitle_width) // 2
    draw.text((subtitle_x, 320), subtitle, fill=(200, 255, 200), font=subtitle_font)
    
    img.save('public/og-image-guide.png', 'PNG', quality=95)
    print("??og-image-guide.png created!")

def create_api_guide_og_image():
    """API ??ë°œê¸‰ ê°€?´ë“œ ?˜ì´ì§€ OG ?´ë?ì§€"""
    width, height = 1200, 630
    img = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(img)
    
    # ë³´ë¼??ê·¸ë¼?°ì´??
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
    
    title = "API ??ë°œê¸‰ ê°€?´ë“œ"
    title_bbox = draw.textbbox((0, 0), title, font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    title_x = (width - title_width) // 2
    draw.text((title_x + 3, 203), title, fill=(0, 0, 0), font=title_font)
    draw.text((title_x, 200), title, fill=(255, 255, 255), font=title_font)
    
    subtitle = "ë¬´ë£Œ Google Gemini API ?¤ì •"
    subtitle_bbox = draw.textbbox((0, 0), subtitle, font=subtitle_font)
    subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
    subtitle_x = (width - subtitle_width) // 2
    draw.text((subtitle_x, 320), subtitle, fill=(255, 255, 150), font=subtitle_font)
    
    img.save('public/og-image-api-guide.png', 'PNG', quality=95)
    print("??og-image-api-guide.png created!")

if __name__ == "__main__":
    print("?¨ Creating OG images...")
    create_og_image()
    create_guide_og_image()
    create_api_guide_og_image()
    print("??All OG images created successfully!")
