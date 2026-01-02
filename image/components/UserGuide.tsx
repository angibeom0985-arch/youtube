import React from 'react';

interface UserGuideProps {
    onBack?: () => void;
    onNavigate?: (view: 'api-guide') => void;
}

const UserGuide: React.FC<UserGuideProps> = ({ onBack, onNavigate }) => {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto py-8 px-4">
                {/* 헤더 */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        유튜브 이미지 생성기 사용법 가이드
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        AI 기반으로 일관된 캐릭터와 스토리보드 이미지를 생성하여 유튜브 롱폼 콘텐츠를 제작하는 완벽한 방법을 알아보세요.
                    </p>
                </div>

                {/* 주요 기능 소개 */}
                <div className="max-w-4xl mx-auto">
                    <div className="grid md:grid-cols-3 gap-6 mb-12">
                        <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-blue-500">
                            <div className="text-3xl mb-3">👥</div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">페르소나 생성</h3>
                            <p className="text-gray-600 text-sm">대본을 분석해 일관된 캐릭터 이미지를 자동으로 생성합니다.</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-green-500">
                            <div className="text-3xl mb-3">🎬</div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">영상 소스 생성</h3>
                            <p className="text-gray-600 text-sm">스크립트를 바탕으로 스토리보드 이미지를 순차적으로 제작합니다.</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-purple-500">
                            <div className="text-3xl mb-3">🎨</div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">다양한 스타일</h3>
                            <p className="text-gray-600 text-sm">실사와 애니메이션 스타일 중 선택하여 원하는 분위기를 연출합니다.</p>
                        </div>
                    </div>
                </div>

                {/* 1단계: API 키 설정 */}
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-lg p-6 shadow-md mb-8 border-l-4 border-blue-500 mt-8">
                        <div className="flex items-center mb-6">
                            <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold mr-4">1</div>
                            <h2 className="text-2xl font-semibold text-gray-900">API 키 설정</h2>
                        </div>
                        
                        <div className="space-y-4">
                            <p className="text-gray-700 leading-relaxed">
                                유튜브 이미지 생성기를 사용하기 위해서는 먼저 <strong>Google Gemini API 키</strong>가 필요합니다.
                            </p>
                            
                            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                                <h4 className="font-semibold text-blue-800 mb-2">API 키 입력 방법:</h4>
                                <ol className="text-blue-800 text-sm space-y-1 list-decimal list-inside">
                                    <li>메인 페이지의 "1️⃣ API 키 입력" 섹션 찾기</li>
                                    <li>비밀번호 입력 필드에 Google Gemini API 키 입력</li>
                                    <li>"API 키 기억하기" 체크박스 선택 (권장)</li>
                                    <li>"📚 API 키 발급 가이드" 버튼으로 키 발급 방법 확인 가능</li>
                                </ol>
                            </div>
                            
                            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                                <p className="text-yellow-800 text-sm">
                                    💡 <strong>보안 팁:</strong> API 키는 암호화되어 저장되며 외부 서버로 전송되지 않습니다. 공용 컴퓨터에서는 "기억하기"를 해제하세요.
                                </p>
                            </div>
                            
                            {/* API 키 발급 가이드 버튼 */}
                            <div className="text-center mt-6">
                                <button
                                    onClick={() => onNavigate?.('api-guide')}
                                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                                >
                                    <span className="mr-2">🔑</span>
                                    API 키 발급 가이드 보기
                                    <span className="ml-2">→</span>
                                </button>
                                <p className="text-gray-500 text-sm mt-2">
                                    Google Gemini API 키를 발급받는 방법을 단계별로 안내합니다
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2단계: 이미지 스타일 및 비율 선택 */}
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-lg p-6 shadow-md mb-8 border-l-4 border-purple-500">
                        <div className="flex items-center mb-6">
                            <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold mr-4">2</div>
                            <h2 className="text-2xl font-semibold text-gray-900">스타일 및 비율 설정</h2>
                        </div>
                        
                        <div className="space-y-6">
                            <div>
                                <h4 className="font-semibold text-gray-800 mb-3">🎨 이미지 스타일 선택</h4>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                                        <h5 className="font-medium text-blue-800">📸 실사 스타일</h5>
                                        <p className="text-blue-700 text-sm mt-1">사실적인 실제 사진 같은 이미지를 생성합니다. 현실적인 콘텐츠에 적합합니다.</p>
                                    </div>
                                    <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                                        <h5 className="font-medium text-purple-800">🎭 애니메이션 스타일</h5>
                                        <p className="text-purple-700 text-sm mt-1">밝고 컬러풀한 만화/애니메이션 스타일입니다. 창의적인 콘텐츠에 이상적입니다.</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <h4 className="font-semibold text-gray-800 mb-3">📐 이미지 비율 선택</h4>
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                                        <h5 className="font-medium text-green-800">📱 9:16 (세로형)</h5>
                                        <p className="text-green-700 text-sm mt-1">인스타그램 스토리, 유튜브 쇼츠용</p>
                                    </div>
                                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                                        <h5 className="font-medium text-blue-800">🖥️ 16:9 (가로형)</h5>
                                        <p className="text-blue-700 text-sm mt-1">유튜브 일반 영상, 영화용</p>
                                    </div>
                                    <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                                        <h5 className="font-medium text-purple-800">⬜ 1:1 (정사각형)</h5>
                                        <p className="text-purple-700 text-sm mt-1">인스타그램 피드용</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3단계: 페르소나 생성 */}
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-lg p-6 shadow-md mb-8 border-l-4 border-green-500 mt-8">
                        <div className="flex items-center mb-6">
                            <div className="bg-gradient-to-br from-green-600 to-green-800 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold mr-4">3</div>
                            <h2 className="text-2xl font-semibold text-gray-900">페르소나 생성</h2>
                        </div>
                        
                        <div className="space-y-4">
                            <p className="text-gray-700 leading-relaxed">
                                캐릭터 설명이나 전체 대본을 입력하면 AI가 등장인물을 자동으로 분석하여 일관된 캐릭터 이미지를 생성합니다.
                            </p>
                            
                            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                                <h4 className="font-semibold text-green-800 mb-2">입력 예시:</h4>
                                <div className="space-y-2 text-green-700 text-sm">
                                    <div>
                                        <strong>• 인물 묘사:</strong> "20대 중반 여성, 긴 흑발, 밝은 미소, 캐주얼한 옷차림"
                                    </div>
                                    <div>
                                        <strong>• 대본 입력:</strong> 전체 스토리 대본을 넣으면 등장인물 자동 추출
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                                <h4 className="font-semibold text-amber-800 mb-2">작성 팁:</h4>
                                <ul className="text-amber-700 text-sm space-y-1 list-disc list-inside">
                                    <li>구체적인 외모 특징 포함 (나이, 헤어스타일, 복장 등)</li>
                                    <li>캐릭터의 성격이나 직업 언급</li>
                                    <li>한국인 특징을 가진 인물로 설정</li>
                                    <li>부정적이거나 민감한 표현 피하기</li>
                                </ul>
                            </div>
                            
                            <p className="text-gray-600 text-sm">
                                콘텐츠 정책 위반 가능성이 감지되면 자동으로 안전한 단어로 교체할 수 있는 옵션이 제공됩니다.
                            </p>
                        </div>
                    </div>
                </div>

                {/* 4단계: 영상 소스 생성 */}
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-lg p-6 shadow-md mb-8 border-l-4 border-indigo-500">
                        <div className="flex items-center mb-6">
                            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold mr-4">4</div>
                            <h2 className="text-2xl font-semibold text-gray-900">영상 소스 생성</h2>
                        </div>
                        
                        <div className="space-y-6">
                            <p className="text-gray-700 leading-relaxed">
                                생성된 페르소나를 활용하여 대본에 맞는 스토리보드 이미지를 순차적으로 만듭니다.
                            </p>
                            
                            <div className="space-y-4">
                                <h4 className="font-semibold text-gray-800">📝 대본 입력</h4>
                                <p className="text-gray-600 text-sm">영상 소스 생성을 위한 상세한 대본을 입력하세요. AI가 장면을 분석하여 적절한 이미지를 생성합니다.</p>
                                
                                <h4 className="font-semibold text-gray-800">💬 자막 설정</h4>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                                        <h5 className="font-medium text-green-800">📝 자막 ON</h5>
                                        <p className="text-green-700 text-xs mt-1">한국어 자막이 포함된 이미지 생성</p>
                                    </div>
                                    <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                                        <h5 className="font-medium text-red-800">🚫 자막 OFF</h5>
                                        <p className="text-red-700 text-xs mt-1">자막 없는 깔끔한 이미지</p>
                                    </div>
                                </div>
                                
                                <h4 className="font-semibold text-gray-800">🎨 일관성 유지 (선택사항)</h4>
                                <p className="text-gray-600 text-sm">참조 이미지를 업로드하면 해당 스타일과 일관성을 유지하며 영상 소스를 생성합니다.</p>
                                
                                <h4 className="font-semibold text-gray-800">📊 생성할 이미지 수</h4>
                                <p className="text-gray-600 text-sm">최대 20개까지 설정 가능하며, 안정적인 생성을 위해 적절한 수량을 선택하세요.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 5단계: 결과 활용 */}
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-lg p-6 shadow-md mb-8 border-l-4 border-orange-500 mt-8">
                        <div className="flex items-center mb-6">
                            <div className="bg-gradient-to-br from-orange-600 to-orange-800 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold mr-4">5</div>
                            <h2 className="text-2xl font-semibold text-gray-900">결과 활용 및 다운로드</h2>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-semibold text-gray-800 mb-3">🔄 재생성 기능</h4>
                                    <ul className="text-gray-600 text-sm space-y-1 list-disc list-inside">
                                        <li>원하지 않는 결과가 나오면 개별 이미지 재생성</li>
                                        <li>전체 영상 소스 한 번 더 생성</li>
                                        <li>다양한 버전 비교 후 선택</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-800 mb-3">💾 다운로드 옵션</h4>
                                    <ul className="text-gray-600 text-sm space-y-1 list-disc list-inside">
                                        <li>개별 이미지 다운로드</li>
                                        <li>전체 이미지를 ZIP 파일로 일괄 다운로드</li>
                                        <li>파일명에 장면 설명 자동 포함</li>
                                    </ul>
                                </div>
                            </div>
                            
                            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                                <h4 className="font-semibold text-blue-800 mb-2">활용 방법:</h4>
                                <ul className="text-blue-700 text-sm space-y-1 list-disc list-inside">
                                    <li>영상 편집 프로그램에서 배경 이미지로 활용</li>
                                    <li>썸네일 제작을 위한 소재로 사용</li>
                                    <li>스토리보드 기반 영상 제작</li>
                                    <li>소셜미디어 콘텐츠 제작</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 최적화 팁 - 콘텐츠와 동일한 너비 */}
                <div className="max-w-4xl mx-auto">
                    <div className="bg-indigo-50 border-l-4 border-indigo-500 p-6 mb-8 rounded-r-lg">
                        <h3 className="text-lg font-semibold text-indigo-800 mb-4">🚀 최적화 팁</h3>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-medium text-indigo-800 mb-2">품질 향상</h4>
                                <ul className="text-indigo-700 text-sm space-y-1 list-disc list-inside">
                                    <li>구체적이고 상세한 대본 작성</li>
                                    <li>캐릭터 특징을 명확하게 기술</li>
                                    <li>장면별 분위기와 배경 설명 포함</li>
                                    <li>일관된 톤앤매너 유지</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-medium text-indigo-800 mb-2">효율적 사용</h4>
                                <ul className="text-indigo-700 text-sm space-y-1 list-disc list-inside">
                                    <li>API 키 저장으로 재입력 방지</li>
                                    <li>적절한 이미지 수량 설정</li>
                                    <li>스타일 일관성 유지</li>
                                    <li>참조 이미지 활용으로 품질 향상</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 문제 해결 - 콘텐츠와 동일한 너비 */}
                <div className="max-w-4xl mx-auto">
                    <div className="bg-red-50 border-l-4 border-red-500 p-6 mb-8 rounded-r-lg mt-8">
                        <h3 className="text-lg font-semibold text-red-800 mb-4">🛠️ 문제 해결</h3>
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-medium text-red-800">이미지 생성이 실패해요</h4>
                                <ul className="text-red-700 text-sm mt-2 space-y-1 list-disc list-inside">
                                    <li>API 키가 올바르게 입력되었는지 확인</li>
                                    <li>콘텐츠 정책에 위반되는 내용이 없는지 검토</li>
                                    <li>대본을 더 일반적이고 긍정적인 내용으로 수정</li>
                                    <li>이미지 생성 수량을 줄여서 재시도</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-medium text-red-800">캐릭터가 일관되지 않아요</h4>
                                <ul className="text-red-700 text-sm mt-2 space-y-1 list-disc list-inside">
                                    <li>페르소나 생성 시 더 구체적인 외모 묘사 추가</li>
                                    <li>참조 이미지를 업로드하여 스타일 일관성 향상</li>
                                    <li>같은 설정(스타일, 비율)으로 생성</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-medium text-red-800">API 사용량이 초과되었어요</h4>
                                <ul className="text-red-700 text-sm mt-2 space-y-1 list-disc list-inside">
                                    <li>Google AI Studio에서 사용량 확인</li>
                                    <li>일정 시간 후 재시도</li>
                                    <li>이미지 생성 개수를 줄여서 사용</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 완료 메시지 - 콘텐츠와 동일한 너비 */}
                <div className="max-w-4xl mx-auto">
                    <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-r-lg">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <span className="text-green-500 text-2xl">🎉</span>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-lg font-medium text-green-800">이제 시작해보세요!</h3>
                                <p className="text-green-700 mt-2 mb-4">
                                    모든 준비가 완료되었습니다. 창의적인 유튜브 콘텐츠 제작을 위한 멋진 이미지들을 만들어보세요!
                                </p>
                                <div className="space-x-3">
                                    <button
                                        onClick={onBack || (() => window.history.back())}
                                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                                    >
                                        🏠 메인 페이지로 돌아가기
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserGuide;