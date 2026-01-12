from PIL import Image, ImageDraw, ImageFont
import os

def create_og_image(output_path, title_text, subtitle_text, bg_color, width, height):
    # ?´ë?ì§€ ?ì„±
    image = Image.new('RGB', (width, height), bg_color)
    draw = ImageDraw.Draw(image)
    
    try:
        # Windows ?œê? ?°íŠ¸ ê²½ë¡œ
        # ?´ë?ì§€ ?¬ê¸°???°ë¼ ?°íŠ¸ ?¬ê¸° ì¡°ì •
        scale = min(width, height) / 630
        title_font = ImageFont.truetype('C:/Windows/Fonts/malgun.ttf', int(80 * scale))
        subtitle_font = ImageFont.truetype('C:/Windows/Fonts/malgun.ttf', int(40 * scale))
        domain_font = ImageFont.truetype('C:/Windows/Fonts/malgun.ttf', int(30 * scale))
    except:
        print("ë§‘ì?ê³ ë”• ?°íŠ¸ë¥?ì°¾ì„ ???†ìŠµ?ˆë‹¤. ê¸°ë³¸ ?°íŠ¸ë¥??¬ìš©?©ë‹ˆ??")
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        domain_font = ImageFont.load_default()
    
    # ?ìŠ¤???„ì¹˜ ê³„ì‚° (ì¤‘ì•™ ?•ë ¬)
    title_bbox = draw.textbbox((0, 0), title_text, font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    title_x = (width - title_width) // 2
    title_y = int(height * 0.32)  # ?ë????„ì¹˜
    
    subtitle_bbox = draw.textbbox((0, 0), subtitle_text, font=subtitle_font)
    subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
    subtitle_x = (width - subtitle_width) // 2
    subtitle_y = int(height * 0.51)  # ?ë????„ì¹˜
    
    domain_text = "youtube.money-hotissue.com"
    domain_bbox = draw.textbbox((0, 0), domain_text, font=domain_font)
    domain_width = domain_bbox[2] - domain_bbox[0]
    domain_x = (width - domain_width) // 2
    domain_y = int(height * 0.76)  # ?ë????„ì¹˜
    
    # ?ìŠ¤??ê·¸ë¦¬ê¸?(?°ìƒ‰)
    draw.text((title_x, title_y), title_text, font=title_font, fill='white')
    draw.text((subtitle_x, subtitle_y), subtitle_text, font=subtitle_font, fill='white')
    
    # ?„ë©”???ìŠ¤??(ë°•ìŠ¤ ë°°ê²½)
    domain_box_padding = int(20 * scale)
    domain_box = [
        domain_x - domain_box_padding,
        domain_y - int(10 * scale),
        domain_x + domain_width + domain_box_padding,
        domain_y + int(50 * scale)
    ]
    draw.rectangle(domain_box, fill='white')
    draw.text((domain_x, domain_y), domain_text, font=domain_font, fill=bg_color)
    
    # ?´ë?ì§€ ?€??
    image.save(output_path, 'PNG', quality=95)
    print(f"OG ?´ë?ì§€ ?ì„± ?„ë£Œ: {output_path}")

# public ?”ë ‰? ë¦¬ ê²½ë¡œ
script_dir = os.path.dirname(os.path.abspath(__file__))
public_dir = os.path.join(os.path.dirname(script_dir), 'public')

# ë©”ì¸ ?˜ì´ì§€ ?´ë?ì§€ (ì§ì‚¬ê°í˜• + ?•ì‚¬ê°í˜•)
create_og_image(
    os.path.join(public_dir, 'og-image.png'),
    '? íŠœë¸??ìƒ ë¶„ì„ AI',
    'AIê°€ ë¶„ì„???¡ìƒ ?ìƒ??ê³µì‹! 1ë¶?ë§Œì—',
    (139, 0, 0),  # ?¤í¬ ?ˆë“œ
    1200, 630
)
create_og_image(
    os.path.join(public_dir, 'og-image-square.png'),
    '? íŠœë¸??ìƒ ë¶„ì„ AI',
    'AIê°€ ë¶„ì„???¡ìƒ ?ìƒ??ê³µì‹! 1ë¶?ë§Œì—',
    (139, 0, 0),  # ?¤í¬ ?ˆë“œ
    1200, 1200
)

# ê°€?´ë“œ ?˜ì´ì§€ ?´ë?ì§€ (ì§ì‚¬ê°í˜• + ?•ì‚¬ê°í˜•)
create_og_image(
    os.path.join(public_dir, 'og-image-guide.png'),
    '?¬ìš©ë²?ê°€?´ë“œ',
    'AI ?ìƒ ë¶„ì„ ?„êµ¬ ?„ë²½ ?¬ìš©ë²?,
    (0, 51, 102),  # ?¤í¬ ë¸”ë£¨
    1200, 630
)
create_og_image(
    os.path.join(public_dir, 'og-image-guide-square.png'),
    '?¬ìš©ë²?ê°€?´ë“œ',
    'AI ?ìƒ ë¶„ì„ ?„êµ¬ ?„ë²½ ?¬ìš©ë²?,
    (0, 51, 102),  # ?¤í¬ ë¸”ë£¨
    1200, 1200
)

# API ê°€?´ë“œ ?˜ì´ì§€ ?´ë?ì§€ (ì§ì‚¬ê°í˜• + ?•ì‚¬ê°í˜•)
create_og_image(
    os.path.join(public_dir, 'og-image-api-guide.png'),
    'API ??ë°œê¸‰ ê°€?´ë“œ',
    'Google AI Studio API ??ë°œê¸‰ ë°©ë²•',
    (75, 0, 130),  # ?¤í¬ ?¼í”Œ
    1200, 630
)
create_og_image(
    os.path.join(public_dir, 'og-image-api-guide-square.png'),
    'API ??ë°œê¸‰ ê°€?´ë“œ',
    'Google AI Studio API ??ë°œê¸‰ ë°©ë²•',
    (75, 0, 130),  # ?¤í¬ ?¼í”Œ
    1200, 1200
)

print("\nëª¨ë“  OG ?´ë?ì§€ ?ì„±???„ë£Œ?˜ì—ˆ?µë‹ˆ?? (ì§ì‚¬ê°í˜• + ?•ì‚¬ê°í˜•)")
