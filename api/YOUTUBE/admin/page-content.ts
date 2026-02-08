import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { pageType } = req.query;

  try {
    // 환경 변수 체크
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      urlPrefix: supabaseUrl?.substring(0, 20),
      pageType
    });

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: 'Configuration error',
        message: 'Supabase credentials not found',
        debug: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey
        }
      });
    }

  // pageType 검증
  if (!pageType || typeof pageType !== 'string') {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'pageType query parameter is required'
    });
  }

  // 허용된 페이지 타입인지 확인
  const allowedPageTypes = ['api-guide-aistudio', 'api-guide-cloudconsole'];
  if (!allowedPageTypes.includes(pageType)) {
    return res.status(400).json({
      error: 'Invalid page type',
      message: `Allowed page types: ${allowedPageTypes.join(', ')}`
    });
  }

  try {
    // 환경 변수 체크
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      urlPrefix: supabaseUrl?.substring(0, 20),
      pageType
    });

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: 'Configuration error',
        message: 'Supabase credentials not found',
        debug: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey
        }
      });
    }

    // Supabase 클라이언트 생성
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    // GET: 페이지 내용 불러오기
    if (req.method === 'GET') {
      console.log('=== GET Request ===');
      console.log('Querying guides table for pageType:', pageType);
      
      const { data, error } = await supabase
        .from('guides')
        .select('*')
        .eq('page_type', pageType)
        .single();

      console.log('Query result - data:', !!data, 'error:', !!error);
      
      if (error) {
        console.error('Database error:', JSON.stringify(error, null, 2));
        if (error.code === 'PGRST116') {
          console.log('No content found, returning empty');
          // 데이터가 없는 경우 빈 내용 반환
          return res.status(200).json({
            page_type: pageType,
            content: '',
            mode: 'basic',
            message: 'No content found for this page'
          });
        }
        return res.status(500).json({
          error: 'Database error',
          message: error.message,
          code: error.code,
          details: error.details || error.hint
        });
      }

      console.log('Returning data successfully');
      return res.status(200).json({
        page_type: data.page_type,
        content: data.data?.content || '',
        mode: data.data?.mode || 'basic',
        updated_at: data.updated_at,
        created_at: data.created_at
      });
    }

    // POST: 페이지 내용 저장하기
    if (req.method === 'POST') {
      const { content, mode, username } = req.body;

      if (!content || typeof content !== 'string') {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'content is required in request body'
        });
      }

      // 데이터 준비 (updated_at 명시적 설정)
      const guideData = {
        page_type: pageType,
        data: {
          content,
          mode: mode || 'basic',
          updated_by: username || 'admin'
        },
        updated_at: new Date().toISOString()
      };

      // UPSERT: 존재하면 업데이트, 없으면 생성
      const { data, error } = await supabase
        .from('guides')
        .upsert(guideData, {
          onConflict: 'page_type'
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({
          error: 'Database error',
          message: error.message,
          details: error.details || error.hint
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Page content saved successfully',
        page_type: data.page_type,
        updated_at: data.updated_at
      });
    }

    // 지원하지 않는 메서드
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only GET and POST methods are supported'
    });

  } catch (error: any) {
    console.error('=== FATAL ERROR ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error:', JSON.stringify(error, null, 2));
    
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred',
      errorName: error.name,
      errorCode: error.code,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
