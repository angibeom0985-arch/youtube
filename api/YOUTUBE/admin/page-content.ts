import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../_lib/supabase';

interface GuideData {
  page_type: string;
  data: {
    content: string;
    mode?: string;
    updated_by?: string;
  };
  created_at?: string;
  updated_at?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 환경 변수 디버깅
  console.log('Environment check:', {
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
    hasViteSupabaseAnonKey: !!process.env.VITE_SUPABASE_ANON_KEY,
    supabaseAdminExists: !!supabaseAdmin
  });

  // Supabase 클라이언트 확인
  if (!supabaseAdmin) {
    console.error('Supabase admin client not initialized');
    return res.status(500).json({
      error: 'Database not configured',
      message: 'Supabase configuration is missing. Please check environment variables.',
      debug: {
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    });
  }

  const { pageType } = req.query;

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
    // GET: 페이지 내용 불러오기
    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('guides')
        .select('*')
        .eq('page_type', pageType)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // 데이터가 없는 경우 빈 내용 반환
          return res.status(200).json({
            page_type: pageType,
            content: '',
            mode: 'basic',
            message: 'No content found for this page'
          });
        }
        console.error('Database error on GET:', error);
        return res.status(500).json({
          error: 'Database error',
          message: error.message,
          details: error.details || error.hint
        });
      }

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
      const { data, error } = await supabaseAdmin
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
    console.error('API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
