import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiSave, FiRefreshCw } from 'react-icons/fi';
import { loadGuideData, saveGuideData, resetGuideData, type GuidePageData, type GuideStep } from '../services/guideDataService';

interface GuideEditorProps {
  pageType: 'aistudio' | 'cloudconsole';
}

const GuideEditor: React.FC<GuideEditorProps> = ({ pageType }) => {
  const [guideData, setGuideData] = useState<GuidePageData | null>(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchGuideData = async () => {
      setLoading(true);
      try {
        const data = await loadGuideData(pageType);
        setGuideData(data);
      } catch (error) {
        console.error('Failed to load guide data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGuideData();
  }, [pageType]);

  const handleSave = async () => {
    if (!guideData) return;
    setSaving(true);
    try {
      await saveGuideData(pageType, guideData);
      setSaveMessage('✅ 저장되었습니다!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('❌ 저장 실패!');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('기본값으로 초기화하시겠습니까?')) return;
    setLoading(true);
    try {
      await resetGuideData(pageType);
      const data = await loadGuideData(pageType);
      setGuideData(data);
      setSaveMessage('🔄 초기화되었습니다!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error(error);
      setSaveMessage('❌ 초기화 실패!');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof GuidePageData, value: any) => {
    if (!guideData) return;
    setGuideData({ ...guideData, [field]: value });
  };

  const updateStep = (index: number, field: keyof GuideStep, value: any) => {
    if (!guideData) return;
    const newSteps = [...guideData.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setGuideData({ ...guideData, steps: newSteps });
  };

  const addStep = () => {
    if (!guideData) return;
    const newStep: GuideStep = {
      id: guideData.steps.length + 1,
      title: '새 단계',
      description: ['설명을 입력하세요'],
      imageSrc: '/images/placeholder.png',
      tips: []
    };
    setGuideData({ ...guideData, steps: [...guideData.steps, newStep] });
  };

  const removeStep = (index: number) => {
    if (!guideData) return;
    if (!window.confirm('이 단계를 삭제하시겠습니까?')) return;
    const newSteps = guideData.steps.filter((_, i) => i !== index);
    // ID 재정렬
    newSteps.forEach((step, i) => step.id = i + 1);
    setGuideData({ ...guideData, steps: newSteps });
  };

  const addFeature = () => {
    if (!guideData) return;
    setGuideData({ ...guideData, features: [...guideData.features, '새 기능'] });
  };

  const updateFeature = (index: number, value: string) => {
    if (!guideData) return;
    const newFeatures = [...guideData.features];
    newFeatures[index] = value;
    setGuideData({ ...guideData, features: newFeatures });
  };

  const removeFeature = (index: number) => {
    if (!guideData) return;
    const newFeatures = guideData.features.filter((_, i) => i !== index);
    setGuideData({ ...guideData, features: newFeatures });
  };

  const addFAQ = () => {
    if (!guideData) return;
    setGuideData({
      ...guideData,
      faqs: [...guideData.faqs, { question: '질문을 입력하세요', answer: '답변을 입력하세요' }]
    });
  };

  const updateFAQ = (index: number, field: 'question' | 'answer', value: string) => {
    if (!guideData) return;
    const newFAQs = [...guideData.faqs];
    newFAQs[index] = { ...newFAQs[index], [field]: value };
    setGuideData({ ...guideData, faqs: newFAQs });
  };

  const removeFAQ = (index: number) => {
    if (!guideData) return;
    const newFAQs = guideData.faqs.filter((_, i) => i !== index);
    setGuideData({ ...guideData, faqs: newFAQs });
  };

  if (!guideData) return <div className="text-white">로딩 중...</div>;

  return (
    <div className="space-y-6">
      {saveMessage && (
        <div className={`p-3 rounded-lg ${saveMessage.includes('✅') ? 'bg-green-900/20 border border-green-700 text-green-300' : 'bg-blue-900/20 border border-blue-700 text-blue-300'
          }`}>
          {saveMessage}
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <button
          onClick={handleReset}
          disabled={loading || saving}
          className="px-4 py-2 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/40 text-yellow-100 rounded-lg transition font-bold flex items-center gap-2 disabled:opacity-50"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} /> {loading ? "처리 중..." : "초기화"}
        </button>
        <button
          onClick={handleSave}
          disabled={loading || saving}
          className="px-4 py-2 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white rounded-lg transition font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.4)] disabled:opacity-50"
        >
          <FiSave /> {saving ? "저장 중..." : "저장"}
        </button>
      </div>

      {/* 기본 정보 */}
      <div className="bg-gray-900/50 border border-red-500/20 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">기본 정보</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">페이지 제목</label>
            <input
              type="text"
              value={guideData.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full bg-black border border-red-500/40 rounded-lg p-3 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">부제목</label>
            <textarea
              value={guideData.subtitle}
              onChange={(e) => updateField('subtitle', e.target.value)}
              className="w-full bg-black border border-red-500/40 rounded-lg p-3 text-white h-20"
            />
          </div>
        </div>
      </div>

      {/* 기능 목록 */}
      <div className="bg-gray-900/50 border border-red-500/20 rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">필요한 기능</h3>
          <button
            onClick={addFeature}
            className="px-3 py-1 bg-green-600/20 border border-green-500/40 text-green-100 rounded-lg text-sm flex items-center gap-2"
          >
            <FiPlus /> 추가
          </button>
        </div>
        <div className="space-y-2">
          {guideData.features.map((feature, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={feature}
                onChange={(e) => updateFeature(index, e.target.value)}
                className="flex-1 bg-black border border-red-500/40 rounded-lg p-2 text-white text-sm"
              />
              <button
                onClick={() => removeFeature(index)}
                className="px-3 py-2 bg-red-600/20 border border-red-500/40 text-red-100 rounded-lg"
              >
                <FiTrash2 />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 단계별 가이드 */}
      <div className="bg-gray-900/50 border border-red-500/20 rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">단계별 가이드</h3>
          <button
            onClick={addStep}
            className="px-3 py-1 bg-green-600/20 border border-green-500/40 text-green-100 rounded-lg text-sm flex items-center gap-2"
          >
            <FiPlus /> 단계 추가
          </button>
        </div>
        <div className="space-y-4">
          {guideData.steps.map((step, index) => (
            <div key={index} className="bg-black/40 border border-red-500/20 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-orange-400">단계 {step.id}</h4>
                <button
                  onClick={() => removeStep(index)}
                  className="px-2 py-1 bg-red-600/20 border border-red-500/40 text-red-100 rounded text-sm"
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">제목</label>
                  <input
                    type="text"
                    value={step.title}
                    onChange={(e) => updateStep(index, 'title', e.target.value)}
                    className="w-full bg-black border border-red-500/40 rounded p-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">이미지 경로</label>
                  <input
                    type="text"
                    value={step.imageSrc}
                    onChange={(e) => updateStep(index, 'imageSrc', e.target.value)}
                    className="w-full bg-black border border-red-500/40 rounded p-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">설명 (줄바꿈으로 구분)</label>
                  <textarea
                    value={step.description.join('\n')}
                    onChange={(e) => updateStep(index, 'description', e.target.value.split('\n'))}
                    className="w-full bg-black border border-red-500/40 rounded p-2 text-white text-sm h-20"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">팁 (줄바꿈으로 구분, 선택사항)</label>
                  <textarea
                    value={(step.tips || []).join('\n')}
                    onChange={(e) => updateStep(index, 'tips', e.target.value.split('\n').filter(t => t.trim()))}
                    className="w-full bg-black border border-red-500/40 rounded p-2 text-white text-sm h-16"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-gray-900/50 border border-red-500/20 rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">자주 묻는 질문</h3>
          <button
            onClick={addFAQ}
            className="px-3 py-1 bg-green-600/20 border border-green-500/40 text-green-100 rounded-lg text-sm flex items-center gap-2"
          >
            <FiPlus /> 추가
          </button>
        </div>
        <div className="space-y-3">
          {guideData.faqs.map((faq, index) => (
            <div key={index} className="bg-black/40 border border-red-500/20 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <label className="text-xs text-gray-400">FAQ {index + 1}</label>
                <button
                  onClick={() => removeFAQ(index)}
                  className="px-2 py-1 bg-red-600/20 border border-red-500/40 text-red-100 rounded text-sm"
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={faq.question}
                  onChange={(e) => updateFAQ(index, 'question', e.target.value)}
                  placeholder="질문"
                  className="w-full bg-black border border-red-500/40 rounded p-2 text-white text-sm"
                />
                <textarea
                  value={faq.answer}
                  onChange={(e) => updateFAQ(index, 'answer', e.target.value)}
                  placeholder="답변"
                  className="w-full bg-black border border-red-500/40 rounded p-2 text-white text-sm h-16"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GuideEditor;
