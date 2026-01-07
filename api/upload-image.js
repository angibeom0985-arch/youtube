const fs = require('fs').promises;
const path = require('path');

module.exports = async (req, res) => {
  // CORS 헤더 설정 - 보안 강화
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? ['https://youtube-image.money-hotissue.com', 'https://www.youtube-image.money-hotissue.com']
    : ['http://localhost:3000', 'http://localhost:3003'];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      const { filename, data } = req.body;
      if (!filename || !data) {
        return res.status(400).json({ error: '파일명과 데이터가 필요합니다.' });
      }

      const imagePath = path.join(process.cwd(), 'public', filename);
      const base64Data = data.replace(/^data:image\/\w+;base64,/, '');
      await fs.writeFile(imagePath, base64Data, 'base64');
      
      console.log(`이미지가 업로드되었습니다: ${filename}`);
      res.status(200).json({ 
        success: true, 
        message: '이미지가 성공적으로 업로드되었습니다. GitHub에 커밋하고 배포해주세요.',
        path: `/${filename}`
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      res.status(500).json({ error: '이미지를 업로드할 수 없습니다.' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
