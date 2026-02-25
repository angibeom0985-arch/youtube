import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../../../server/shared/adminAuth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS ?ㅻ뜑 ?ㅼ젙
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { pageType } = req.query;

    // pageType 寃利?
    if (!pageType || typeof pageType !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'pageType query parameter is required'
      });
    }

    // ?덉슜???섏씠吏 ??낆씤吏 ?뺤씤
    const allowedPageTypes = ['api-guide-aistudio', 'api-guide-cloudconsole'];
    if (!allowedPageTypes.includes(pageType)) {
      return res.status(400).json({
        error: 'Invalid page type',
        message: `Allowed page types: ${allowedPageTypes.join(', ')}`
      });
    }

    // ?섍꼍 蹂??泥댄겕
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

    // Supabase ?대씪?댁뼵???앹꽦
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    // GET: ?섏씠吏 ?댁슜 遺덈윭?ㅺ린
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
          // ?곗씠?곌? ?녿뒗 寃쎌슦 鍮??댁슜 諛섑솚
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

    // POST: ?섏씠吏 ?댁슜 ??ν븯湲?
    if (req.method === 'POST') {
      const { content, mode, username } = req.body;
      const adminSession = requireAdmin(req);
      if (!adminSession) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Admin authentication required'
        });
      }

      if (!content || typeof content !== 'string') {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'content is required in request body'
        });
      }

      // ?곗씠??以鍮?(updated_at 紐낆떆???ㅼ젙)
      const guideData = {
        page_type: pageType,
        data: {
          content,
          mode: mode || 'basic',
          updated_by: username || 'admin'
        },
        updated_at: new Date().toISOString()
      };

      // UPSERT: 議댁옱?섎㈃ ?낅뜲?댄듃, ?놁쑝硫??앹꽦
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

    // 吏?먰븯吏 ?딅뒗 硫붿꽌??
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
