import React, { useState, useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { compressImage, canStoreInLocalStorage } from "./utils/imageCompression";
import {
  generateCharacters,
  generateStoryboard,
  regenerateCharacterImage,
  regenerateStoryboardImage,
  generateCameraAngles,
} from "./services/geminiService";
import { supabase } from "./services/supabase";
import { detectUnsafeWords, replaceUnsafeWords } from "./utils/contentSafety";
import {
  AspectRatio,
  BackgroundStyle,
  CameraAngle,
  CameraAngleImage,
  Character,
  CharacterStyle,
  ImageStyle,
  PhotoComposition,
  VideoSourceImage,
} from "./types";
import type { User } from "@supabase/supabase-js";

import HomeBackButton from "../../components/HomeBackButton";
import AspectRatioSelector from "./components/AspectRatioSelector";
import Spinner from "./components/Spinner";
import CharacterCard from "./components/CharacterCard";
import StoryboardImage from "./components/StoryboardImage";
import Slider from "./components/Slider";
import MetaTags from "./components/MetaTags";
import UserGuide from "./components/UserGuide";
import AdBanner from "./components/AdBanner";
import FloatingBottomAd from "./components/FloatingBottomAd";
import SideFloatingAd from "./components/SideFloatingAd";
import AdBlockDetector from "./components/AdBlockDetector";
import ApiKeyRequiredModal from "./components/ApiKeyRequiredModal";
import ApiKeyInput from "./components/ApiKeyInput";

type ImageAppView = "main" | "user-guide" | "image-prompt";

interface ImageAppProps {
  basePath?: string;
  initialScript?: string;
}

const App: React.FC<ImageAppProps> = ({
  basePath = "/image",
  initialScript = "",
}) => {
  const [currentView, setCurrentView] = useState<ImageAppView>("main");
  const navigate = useNavigate();
  const location = useLocation();
  const navigationScript =
    ((location.state as { script?: string } | null)?.script) || "";
  const normalizedBasePath =
    basePath && basePath !== "/" ? basePath.replace(/\/$/, "") : "";

  // Check for no_ads query param
  const searchParams = new URLSearchParams(location.search);
  const noAds = searchParams.get("no_ads") === "true";
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
  const [imageStyle, setImageStyle] = useState<"realistic" | "animation">(
    "realistic"
  ); // 기존 이미지 스타일 (실사/애니메이션)
  const [personaStyle, setPersonaStyle] = useState<ImageStyle>("실사 극대화"); // 기존 페르소나 스타일 (호환성 유지)
  const [characterStyle, setCharacterStyle] =
    useState<CharacterStyle>("실사 극대화"); // 인물 스타일
  const [backgroundStyle, setBackgroundStyle] =
    useState<BackgroundStyle>("모던"); // 배경/분위기 스타일
  const [customCharacterStyle, setCustomCharacterStyle] = useState<string>(""); // 커스텀 인물 스타일
  const [customBackgroundStyle, setCustomBackgroundStyle] =
    useState<string>(""); // 커스텀 배경 스타일
  const [customStyle, setCustomStyle] = useState<string>(""); // 커스텀 스타일 입력 (기존 호환성)
  const [photoComposition, setPhotoComposition] =
    useState<PhotoComposition>("정면"); // 사진 구도
  const [customPrompt, setCustomPrompt] = useState<string>(""); // 커스텀 이미지 프롬프트
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9"); // 이미지 비율 선택
  const [personaInput, setPersonaInput] = useState<string>(""); // 페르소나 생성용 입력
  const [videoSourceScript, setVideoSourceScript] = useState<string>(""); // 영상 소스용 대본
  const [subtitleEnabled, setSubtitleEnabled] = useState<boolean>(false); // 자막 포함 여부 - 기본 OFF
  const [personaReferenceImage, setPersonaReferenceImage] = useState<
    string | null
  >(null); // 페르소나용 참조 이미지 (선택사항)
  const [referenceImage, setReferenceImage] = useState<string | null>(null); // 영상 소스용 참조 이미지
  const [characters, setCharacters] = useState<Character[]>([]);
  const [videoSource, setVideoSource] = useState<VideoSourceImage[]>([]);
  const [imageCount, setImageCount] = useState<number>(5);
  const [isLoadingCharacters, setIsLoadingCharacters] =
    useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<string>(""); // 로딩 진행 상황 메시지
  const [isLoadingVideoSource, setIsLoadingVideoSource] =
    useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [personaError, setPersonaError] = useState<string | null>(null);
  const [contentWarning, setContentWarning] = useState<{
    unsafeWords: string[];
    replacements: Array<{ original: string; replacement: string }>;
  } | null>(null);
  const [isContentWarningAcknowledged, setIsContentWarningAcknowledged] =
    useState<boolean>(false);
  const [hasContentWarning, setHasContentWarning] = useState<boolean>(false);

  // 카메라 앵글 기능 관련 state
  const [cameraAngleSourceImage, setCameraAngleSourceImage] = useState<string | null>(null);
  const [selectedCameraAngles, setSelectedCameraAngles] = useState<CameraAngle[]>([
    'Front View', 'Right Side View', 'Left Side View', 'Back View', 'Full Body', 'Close-up Face'
  ]); // 기본값: 전체 선택
  const [cameraAngles, setCameraAngles] = useState<CameraAngleImage[]>([]);
  const [isLoadingCameraAngles, setIsLoadingCameraAngles] = useState<boolean>(false);
  const [cameraAngleProgress, setCameraAngleProgress] = useState<string>("");
  const [cameraAngleError, setCameraAngleError] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  const getAuthHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return { headers, token };
  }, []);

  const IMAGE_CREDIT_COST = 0;

  const deductCredits = useCallback(async (cost: number) => {
    // 크레딧 시스템 비활성화
    return;
  }, []);

  const refundCredits = useCallback(async (cost: number) => {
    // 크레딧 시스템 비활성화
    return;
  }, []);

  // URL 기반 현재 뷰 결정
  useEffect(() => {
    const path = decodeURIComponent(location.pathname);
    const relativePath =
      normalizedBasePath && path.startsWith(normalizedBasePath)
        ? path.slice(normalizedBasePath.length) || "/"
        : path;

    if (
      relativePath === "/user-guide" ||
      (relativePath.includes("사용법") && relativePath.includes("가이드"))
    ) {
      setCurrentView("user-guide");
    } else if (relativePath === "/image-prompt") {
      setCurrentView("image-prompt");
    } else {
      setCurrentView("main");
    }
  }, [location.pathname, normalizedBasePath]);

  const navigateToView = useCallback(
    (view: ImageAppView) => {
      setCurrentView(view);
      const suffix =
        view === "user-guide"
          ? "/user-guide"
          : view === "image-prompt"
            ? "/image-prompt"
            : "";
      const targetPath =
        ((normalizedBasePath || "") + suffix) || "/";
      navigate(targetPath, { replace: true });
    },
    [navigate, normalizedBasePath]
  );

  // API 키 모달 자동 표시 비활성화 (사용자가 직접 입력)
  // useEffect(() => {
  //   if (!apiKey) {
  //     setShowApiKeyModal(true);
  //   }
  // }, [apiKey]);

  // 컴포넌트 마운트 시 저장된 작업 데이터 불러오기 (localStorage 우선, 없으면 sessionStorage)
  useEffect(() => {
    try {
      let savedData = localStorage.getItem("youtube_image_work_data");
      let source = "localStorage";

      // localStorage에 없으면 sessionStorage 확인
      if (!savedData) {
        savedData = sessionStorage.getItem("youtube_image_work_data");
        source = "sessionStorage";
      }

      console.log(`🔄 ${source}에서 데이터 불러오기 시도...`, savedData ? `${savedData.length} bytes` : "없음");

      if (savedData) {
        const parsed = JSON.parse(savedData);
        console.log("📦 파싱된 데이터:", {
          characters: parsed.characters?.length || 0,
          videoSource: parsed.videoSource?.length || 0,
          cameraAngles: parsed.cameraAngles?.length || 0,
          savedAt: parsed.savedAt,
          version: parsed.version,
        });

        // 복원된 항목 카운트
        let restoredCount = 0;
        const restoredItems: string[] = [];

        if (parsed.characters && parsed.characters.length > 0) {
          setCharacters(parsed.characters);
          restoredCount++;
          restoredItems.push(`페르소나: ${parsed.characters.length}개`);
          console.log("? 페르소나 복원:", parsed.characters.length, "개");
        }
        if (parsed.videoSource && parsed.videoSource.length > 0) {
          setVideoSource(parsed.videoSource);
          restoredCount++;
          restoredItems.push(`영상소스: ${parsed.videoSource.length}개`);
          console.log("? 영상 소스 복원:", parsed.videoSource.length, "개");
        }
        if (parsed.cameraAngles && parsed.cameraAngles.length > 0) {
          setCameraAngles(parsed.cameraAngles);
          restoredCount++;
          restoredItems.push(`카메라앵글: ${parsed.cameraAngles.length}개`);
          console.log("? 카메라 앵글 복원:", parsed.cameraAngles.length, "개");
        }

        // 설정 복원
        if (parsed.personaInput) setPersonaInput(parsed.personaInput);
        if (parsed.videoSourceScript)
          setVideoSourceScript(parsed.videoSourceScript);
        if (parsed.personaReferenceImage) {
          setPersonaReferenceImage(parsed.personaReferenceImage);
          restoredItems.push("페르소나 참조 이미지 ?");
          console.log("? 페르소나 참조 이미지 복원");
        }
        if (parsed.referenceImage) {
          setReferenceImage(parsed.referenceImage);
          restoredItems.push("영상소스 참조 이미지 ?");
          console.log("? 영상소스 참조 이미지 복원");
        }
        if (parsed.imageStyle) setImageStyle(parsed.imageStyle);
        if (parsed.personaStyle) setPersonaStyle(parsed.personaStyle);
        if (parsed.customCharacterStyle) setCustomCharacterStyle(parsed.customCharacterStyle);
        if (parsed.customBackgroundStyle) setCustomBackgroundStyle(parsed.customBackgroundStyle);
        if (parsed.customStyle) setCustomStyle(parsed.customStyle);
        if (parsed.photoComposition) setPhotoComposition(parsed.photoComposition);
        if (parsed.customPrompt) setCustomPrompt(parsed.customPrompt);
        if (parsed.selectedCameraAngles && parsed.selectedCameraAngles.length > 0) {
          setSelectedCameraAngles(parsed.selectedCameraAngles);
        }
        if (parsed.characterStyle) setCharacterStyle(parsed.characterStyle);
        if (parsed.backgroundStyle) setBackgroundStyle(parsed.backgroundStyle);
        if (parsed.aspectRatio) setAspectRatio(parsed.aspectRatio);
        if (parsed.imageCount) setImageCount(parsed.imageCount);
        if (parsed.subtitleEnabled !== undefined)
          setSubtitleEnabled(parsed.subtitleEnabled);
        if (parsed.cameraAngleSourceImage) {
          setCameraAngleSourceImage(parsed.cameraAngleSourceImage);
          restoredItems.push("카메라앵글 원본 이미지 ?");
          console.log("? 카메라 앵글 원본 이미지 복원");
        }

        console.log(`✅ 작업 데이터 복원 완료 (from ${source}):`, {
          페르소나: parsed.characters?.length || 0,
          영상소스: parsed.videoSource?.length || 0,
          카메라앵글: parsed.cameraAngles?.length || 0,
          savedAt: parsed.savedAt ? new Date(parsed.savedAt).toLocaleString('ko-KR') : 'unknown',
        });

        // 복원 성공 시 콘솔에만 로그 (알림창 제거)
        if (restoredCount > 0 || restoredItems.length > 0) {
          // 마지막 작업 유형 파악 (저장된 값 우선 사용)
          let lastWorkType = parsed.lastWorkType || '';

          // lastWorkType이 저장되지 않은 경우 (이전 버전 호환성)
          if (!lastWorkType) {
            if (parsed.cameraAngles?.length > 0) {
              lastWorkType = '카메라앵글 변환';
            } else if (parsed.videoSource?.length > 0) {
              lastWorkType = '영상소스 생성';
            } else if (parsed.characters?.length > 0) {
              lastWorkType = '페르소나 생성';
            }
          }

          const savedTime = parsed.savedAt ? new Date(parsed.savedAt).toLocaleString('ko-KR') : '알 수 없음';

          console.log("✅ 복원 완료!");
          console.log(`🧾 마지막 작업: ${lastWorkType}`);
          console.log(`? 저장 시각: ${savedTime}`);
          console.log(`📦 복원된 항목: ${restoredItems.join(', ')}`);
        } else {
          console.log("ℹ️ 복원할 작업물이 없습니다 (설정만 복원됨)");
        }
      } else {
        console.log("ℹ️ 저장된 데이터 없음 (localStorage & sessionStorage 모두)");
      }
    } catch (e) {
      console.error("? 작업 데이터 불러오기 실패:", e);
      // 손상된 데이터 삭제
      try {
        localStorage.removeItem("youtube_image_work_data");
      } catch (storageError) {
        console.error("? localStorage 정리 실패:", storageError);
      }
      try {
        sessionStorage.removeItem("youtube_image_work_data");
      } catch (storageError) {
        console.error("? sessionStorage 정리 실패:", storageError);
      }
      alert("⚠️ 저장된 데이터가 손상되어 불러올 수 없습니다.\n새로 시작해주세요.");
    }
  }, []);

  useEffect(() => {
    const scriptToApply = initialScript || navigationScript;
    if (scriptToApply && !videoSourceScript.trim()) {
      setVideoSourceScript(scriptToApply);
    }
  }, [initialScript, navigationScript, videoSourceScript]);

  // 저장 함수를 별도로 분리 (즉시 저장 가능하도록)
  const saveDataToStorage = useCallback(async (immediate = false) => {
    // 저장할 데이터가 없으면 스킵
    const hasWorkData =
      characters.length > 0 ||
      videoSource.length > 0 ||
      cameraAngles.length > 0 ||
      Boolean(personaInput.trim()) ||
      Boolean(videoSourceScript.trim()) ||
      Boolean(personaReferenceImage) ||
      Boolean(referenceImage) ||
      Boolean(customPrompt.trim()) ||
      Boolean(customStyle.trim()) ||
      Boolean(customCharacterStyle.trim()) ||
      Boolean(customBackgroundStyle.trim()) ||
      Boolean(cameraAngleSourceImage);

    if (!hasWorkData) {
      return;
    }

    const timestamp = new Date().toLocaleTimeString('ko-KR');
    console.log(`💾 [${timestamp}] 데이터 저장 시작${immediate ? ' (즉시 저장)' : ''}:`, {
      페르소나: characters.length,
      영상소스: videoSource.length,
      카메라앵글: cameraAngles.length
    });

    try {
      // 이미지 압축 (용량 최적화)
      console.log(`🗜️ [${timestamp}] 이미지 압축 시작...`);
      const compressedCharacters = await Promise.all(
        characters.slice(0, 10).map(async (char, idx) => {
          console.log(`  - 페르소나 #${idx + 1} 압축 중...`);
          return {
            ...char,
            image: char.image ? await compressImage(char.image, 600, 0.6) : char.image,
          };
        })
      );
      console.log(`? [${timestamp}] 페르소나 ${compressedCharacters.length}개 압축 완료`);

      const compressedVideoSource = await Promise.all(
        videoSource.slice(0, 10).map(async (source, idx) => {
          console.log(`  - 영상소스 #${idx + 1} 압축 중...`);
          return {
            ...source,
            image: source.image ? await compressImage(source.image, 600, 0.6) : source.image,
          };
        })
      );
      console.log(`? [${timestamp}] 영상소스 ${compressedVideoSource.length}개 압축 완료`);

      const compressedCameraAngles = await Promise.all(
        cameraAngles.slice(0, 10).map(async (angle, idx) => {
          console.log(`  - 카메라앵글 #${idx + 1} 압축 중...`);
          return {
            ...angle,
            image: angle.image ? await compressImage(angle.image, 600, 0.6) : angle.image,
          };
        })
      );
      console.log(`? [${timestamp}] 카메라앵글 ${compressedCameraAngles.length}개 압축 완료`);

      // 마지막 작업 유형 결정 (가장 최근 작업)
      let lastWorkType = '';
      if (compressedCameraAngles.length > 0) {
        lastWorkType = '카메라앵글 변환';
      } else if (compressedVideoSource.length > 0) {
        lastWorkType = '영상소스 생성';
      } else if (compressedCharacters.length > 0) {
        lastWorkType = '페르소나 생성';
      }

      const dataToSave: any = {
        characters: compressedCharacters,
        videoSource: compressedVideoSource,
        personaInput,
        videoSourceScript,
        personaStyle,
        customCharacterStyle,
        customBackgroundStyle,
        customStyle,
        photoComposition,
        customPrompt,
        selectedCameraAngles,
        personaReferenceImage: personaReferenceImage
          ? await compressImage(personaReferenceImage, 400, 0.5)
          : null,
        referenceImage: referenceImage
          ? await compressImage(referenceImage, 400, 0.5)
          : null,
        imageStyle,
        characterStyle,
        backgroundStyle,
        aspectRatio,
        imageCount,
        subtitleEnabled,
        cameraAngleSourceImage: cameraAngleSourceImage
          ? await compressImage(cameraAngleSourceImage, 600, 0.6)
          : null,
        cameraAngles: compressedCameraAngles,
        savedAt: new Date().toISOString(),
        version: "1.0.0", // 버전 추가로 호환성 관리
      };

      // lastWorkType이 있는 경우에만 추가
      if (lastWorkType) {
        dataToSave.lastWorkType = lastWorkType;
      }

      const jsonString = JSON.stringify(dataToSave);
      const sizeInMB = (jsonString.length / 1024 / 1024).toFixed(2);
      console.log(`💾 [${timestamp}] 저장할 데이터 크기: ${sizeInMB}MB (${jsonString.length} bytes)`);

      // localStorage 용량 체크 (4MB 제한)
      if (!canStoreInLocalStorage(jsonString, 4)) {
        console.warn(`⚠️ [${timestamp}] 데이터가 너무 커서 일부만 저장합니다.`);
        // 용량 초과 시 카메라 앵글 제외하고 재시도
        const minimalData = {
          ...dataToSave,
          cameraAngles: [],
        };
        const minimalJsonString = JSON.stringify(minimalData);

        if (!canStoreInLocalStorage(minimalJsonString, 4)) {
          console.warn(`⚠️ [${timestamp}] 여전히 용량 초과, 영상 소스도 제외합니다.`);
          const veryMinimalData = {
            ...minimalData,
            videoSource: [],
          };
          localStorage.setItem("youtube_image_work_data", JSON.stringify(veryMinimalData));
          sessionStorage.setItem("youtube_image_work_data", JSON.stringify(veryMinimalData));
          console.log(`? [${timestamp}] 최소 데이터만 저장됨 (페르소나 + 설정)`);
        } else {
          localStorage.setItem("youtube_image_work_data", minimalJsonString);
          sessionStorage.setItem("youtube_image_work_data", minimalJsonString);
          console.log(`? [${timestamp}] 일부 데이터 저장됨 (카메라 앵글 제외)`);
        }
      } else {
        localStorage.setItem("youtube_image_work_data", jsonString);
        sessionStorage.setItem("youtube_image_work_data", jsonString);
        console.log(`? [${timestamp}] 전체 데이터 저장 완료! (localStorage + sessionStorage 이중 백업)`);
      }
    } catch (e) {
      if (e instanceof Error && e.name === "QuotaExceededError") {
        console.error("? localStorage 용량 초과! 이전 데이터를 삭제합니다.");
        localStorage.removeItem("youtube_image_work_data");
        sessionStorage.removeItem("youtube_image_work_data");
        try {
          // 최소 데이터만 저장
          const minimalData = {
            personaInput,
            videoSourceScript,
            personaStyle,
            customCharacterStyle,
            customBackgroundStyle,
            customStyle,
            photoComposition,
            customPrompt,
            selectedCameraAngles,
            imageStyle,
            characterStyle,
            backgroundStyle,
            aspectRatio,
            imageCount,
            subtitleEnabled,
            savedAt: new Date().toISOString(),
          };
          localStorage.setItem("youtube_image_work_data", JSON.stringify(minimalData));
          console.log("? 설정 데이터만 저장됨");
        } catch (retryError) {
          console.error("? 재시도도 실패:", retryError);
        }
      } else {
        console.error("? 작업 데이터 저장 실패:", e);
      }
    }
  }, [
    characters,
    videoSource,
    personaInput,
    videoSourceScript,
    personaStyle,
    customCharacterStyle,
    customBackgroundStyle,
    customStyle,
    photoComposition,
    customPrompt,
    selectedCameraAngles,
    personaReferenceImage,
    referenceImage,
    imageStyle,
    characterStyle,
    backgroundStyle,
    aspectRatio,
    imageCount,
    subtitleEnabled,
    cameraAngleSourceImage,
    cameraAngles,
  ]);

  // 작업 데이터가 변경될 때마다 localStorage + sessionStorage에 저장 (이중 백업)
  useEffect(() => {
    // 초기 마운트 시에는 저장하지 않음 (데이터 로드 후에만 저장)
    const hasData =
      characters.length > 0 ||
      videoSource.length > 0 ||
      cameraAngles.length > 0 ||
      Boolean(personaInput.trim()) ||
      Boolean(videoSourceScript.trim()) ||
      Boolean(personaReferenceImage) ||
      Boolean(referenceImage) ||
      Boolean(customPrompt.trim()) ||
      Boolean(customStyle.trim()) ||
      Boolean(customCharacterStyle.trim()) ||
      Boolean(customBackgroundStyle.trim()) ||
      Boolean(cameraAngleSourceImage);

    if (!hasData) {
      return; // 데이터가 없으면 저장하지 않음
    }

    // debounce를 위해 타이머 사용
    const timer = setTimeout(() => {
      console.log('💾 자동 저장 트리거 (1초 debounce 후)');
      saveDataToStorage(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    saveDataToStorage,
    characters.length,
    videoSource.length,
    cameraAngles.length,
    personaInput,
    videoSourceScript,
    personaReferenceImage,
    referenceImage,
    customPrompt,
    customStyle,
    customCharacterStyle,
    customBackgroundStyle,
    cameraAngleSourceImage,
  ]);

  // 보안: 드래그, 우클릭, 캡처 방지
  useEffect(() => {
    // 디버그 페이지에서는 보호 기능 비활성화
    if (basePath === "/debug/image") {
      return;
    }

    // 입력 필드인지 확인하는 헬퍼 함수
    const isInputField = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof HTMLElement)) return false;
      const tagName = target.tagName.toLowerCase();
      return (
        tagName === "input" ||
        tagName === "textarea" ||
        target.isContentEditable
      );
    };

    // 드래그, 선택, 우클릭, 복사 차단 (입력 필드 제외)
    const preventDefaultExceptInput = (e: Event) => {
      if (!isInputField(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    document.addEventListener("contextmenu", preventDefaultExceptInput, {
      capture: true,
    });
    document.addEventListener("selectstart", preventDefaultExceptInput, {
      capture: true,
    });
    document.addEventListener("dragstart", preventDefaultExceptInput, {
      capture: true,
    });
    document.addEventListener("copy", preventDefaultExceptInput, {
      capture: true,
    });
    document.addEventListener("cut", preventDefaultExceptInput, {
      capture: true,
    });

    // 마우스 우클릭 차단 (드래그프리류 우회 방지, 입력 필드 제외)
    const blockRightClick = (e: MouseEvent) => {
      if (e.button === 2 && !isInputField(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };
    document.addEventListener("mousedown", blockRightClick, { capture: true });
    document.addEventListener("mouseup", blockRightClick, { capture: true });

    // CSS로 선택 방지 (입력 필드는 스타일로 예외 처리)
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
    // 입력 필드는 선택 가능하도록 스타일 추가
    const style = document.createElement("style");
    style.textContent = `
      input, textarea, [contenteditable="true"] {
        user-select: text !important;
        -webkit-user-select: text !important;
      }
    `;
    document.head.appendChild(style);

    // 키보드 단축키 차단 (입력 필드에서는 편집 단축키 허용)
    const blockKeys = (e: KeyboardEvent) => {
      const target = e.target;
      const isInput = isInputField(target);

      // 입력 필드에서는 기본 편집 단축키 허용
      // Ctrl+C (복사), Ctrl+V (붙여넣기), Ctrl+X (잘라내기), Ctrl+A (전체선택)
      // Ctrl+Z (되돌리기), Ctrl+Y (다시실행), Ctrl+Shift+Z (다시실행)
      if (isInput) {
        // 입력 필드에서 허용할 단축키
        const allowedKeys = [
          "c",
          "v",
          "x",
          "a",
          "z",
          "y",
          "C",
          "V",
          "X",
          "A",
          "Z",
          "Y",
        ];
        const key = e.key.toLowerCase();

        // Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z는 항상 허용
        if (e.ctrlKey && !e.shiftKey && (key === "z" || key === "y")) {
          return; // 이벤트 정상 진행
        }
        if (e.ctrlKey && e.shiftKey && key === "z") {
          return; // 이벤트 정상 진행
        }

        // Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A는 Shift 없을 때만 허용
        if (e.ctrlKey && !e.shiftKey && allowedKeys.includes(e.key)) {
          return; // 이벤트 정상 진행 (복사/붙여넣기/잘라내기/전체선택)
        }
      }

      // 저장/인쇄/캡처 관련 키는 모든 곳에서 차단

      // Ctrl+S (페이지 저장) - 모든 곳에서 차단
      if (e.ctrlKey && !e.shiftKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl+P (인쇄) - 모든 곳에서 차단
      if (e.ctrlKey && !e.shiftKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl+Shift+S (페이지 저장/스크롤 캡처) - 모든 곳에서 차단
      if (e.ctrlKey && e.shiftKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl+Shift+C (직접 지정 캡처) - 입력 필드 제외하고 차단
      if (
        !isInput &&
        e.ctrlKey &&
        e.shiftKey &&
        (e.key === "c" || e.key === "C")
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl+Shift+W (창 캡처) - 모든 곳에서 차단
      if (e.ctrlKey && e.shiftKey && (e.key === "w" || e.key === "W")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl+Shift+D (단위영역 캡처) - 모든 곳에서 차단
      if (e.ctrlKey && e.shiftKey && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl+Shift+A (전체캡처) - 입력 필드 제외하고 차단
      if (
        !isInput &&
        e.ctrlKey &&
        e.shiftKey &&
        (e.key === "a" || e.key === "A")
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl+Shift+F (지정사이즈 캡처) - 모든 곳에서 차단
      if (e.ctrlKey && e.shiftKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // PrintScreen 키 - 모든 곳에서 차단
      if (e.key === "PrintScreen") {
        e.preventDefault();
        e.stopPropagation();
        // 클립보드 지우기 시도
        if (navigator.clipboard) {
          navigator.clipboard.writeText("").catch(() => { });
        }
        return false;
      }
      // Win+Shift+S (Windows 스크린샷 도구) - 모든 곳에서 차단
      if (e.shiftKey && e.metaKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // F12 (개발자 도구) - 모든 곳에서 차단
      if (e.key === "F12") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl+Shift+I (개발자 도구) - 모든 곳에서 차단
      if (e.ctrlKey && e.shiftKey && (e.key === "i" || e.key === "I")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };
    document.addEventListener("keydown", blockKeys, { capture: true });
    document.addEventListener("keyup", blockKeys, { capture: true });

    // 클린업
    return () => {
      document.removeEventListener("contextmenu", preventDefaultExceptInput, {
        capture: true,
      });
      document.removeEventListener("selectstart", preventDefaultExceptInput, {
        capture: true,
      });
      document.removeEventListener("dragstart", preventDefaultExceptInput, {
        capture: true,
      });
      document.removeEventListener("copy", preventDefaultExceptInput, {
        capture: true,
      });
      document.removeEventListener("cut", preventDefaultExceptInput, {
        capture: true,
      });
      document.removeEventListener("mousedown", blockRightClick, {
        capture: true,
      });
      document.removeEventListener("mouseup", blockRightClick, {
        capture: true,
      });
      document.removeEventListener("keydown", blockKeys, { capture: true });
      document.removeEventListener("keyup", blockKeys, { capture: true });
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
      // 추가한 스타일 제거
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, []);

  const openImageInNewWindow = useCallback(
    (imageData: string, title: string = "이미지 보기") => {
      const imageSrc = imageData.startsWith("data:image")
        ? imageData
        : `data:image/png;base64,${imageData}`;
      const imageWindow = window.open(
        "",
        "_blank",
        "width=900,height=700,scrollbars=yes,resizable=yes"
      );
      if (!imageWindow) return;

      imageWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            background: #0f172a;
            color: #e2e8f0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 100vh;
          }
          img {
            max-width: 100%;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
          }
          h1 {
            font-size: 18px;
            margin: 0 0 16px;
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <img src="${imageSrc}" alt="${title}" />
      </body>
      </html>
    `);
      imageWindow.document.close();
    },
    []
  );

  const checkAndReplaceContent = useCallback(
    (text: string) => {
      const unsafeWords = detectUnsafeWords(text);
      if (unsafeWords.length > 0) {
        const { replacements } = replaceUnsafeWords(text);
        setContentWarning({ unsafeWords, replacements });
        setHasContentWarning(true);
        return isContentWarningAcknowledged;
      }
      setContentWarning(null);
      setHasContentWarning(false);
      return true;
    },
    [isContentWarningAcknowledged]
  );

  const handleAutoReplace = useCallback(() => {
    if (!contentWarning) return;
    const { replacedText: replacedPersona } = replaceUnsafeWords(personaInput);
    const { replacedText: replacedScript } =
      replaceUnsafeWords(videoSourceScript);
    setPersonaInput(replacedPersona);
    setVideoSourceScript(replacedScript);
    setContentWarning(null);
    setHasContentWarning(false);
    setIsContentWarningAcknowledged(true);
  }, [contentWarning, personaInput, videoSourceScript]);

  const handleAcknowledgeWarning = useCallback(() => {
    setIsContentWarningAcknowledged(true);
  }, []);

  const handleReferenceImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        setError("참조 이미지는 최대 10MB까지 업로드할 수 있습니다.");
        event.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.includes(",") ? result.split(",")[1] : result;
        setReferenceImage(base64);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const handleRemoveReferenceImage = useCallback(() => {
    setReferenceImage(null);
  }, []);

  const handleCameraAngleImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        setCameraAngleError("원본 이미지는 최대 10MB까지 업로드할 수 있습니다.");
        event.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setCameraAngleSourceImage(result);
        setCameraAngles([]);
        setCameraAngleError(null);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const handleGeneratePersonas = useCallback(async () => {
    if (!apiKey.trim()) {
      setPersonaError(
        "서버 API 키가 설정되지 않았습니다. 관리자에게 문의해주세요."
      );
      return;
    }
    if (!personaInput.trim()) {
      setPersonaError("❌ 페르소나 설명이나 대본을 입력해주세요.");
      return;
    }

    const isSafe = checkAndReplaceContent(personaInput);
    if (!isSafe) {
      setIsContentWarningAcknowledged(false);
      return;
    }

    setIsLoadingCharacters(true);
    setPersonaError(null);
    setCharacters([]);
    setLoadingProgress("페르소나 분석 중...");

    // 최대 예상 비용 (보통 1-3개 생성됨, 최대 5개로 가정)
    const estimatedCost = 5 * IMAGE_CREDIT_COST;
    let creditDeducted = false;

    try {
      // 1. 크레딧 먼저 차감
      await deductCredits(estimatedCost);
      creditDeducted = true;

      // 2. 이미지 생성
      const generatedCharacters = await generateCharacters(
        personaInput,
        apiKey,
        imageStyle,
        aspectRatio,
        personaStyle,
        customStyle,
        photoComposition,
        customPrompt,
        characterStyle,
        backgroundStyle,
        customCharacterStyle,
        customBackgroundStyle,
        personaReferenceImage,
        (progress) => setLoadingProgress(progress)
      );

      if (generatedCharacters.length === 0) {
        // 생성 실패 시 크레딧 환불
        if (creditDeducted) {
          await refundCredits(estimatedCost);
        }
        setPersonaError(
          "페르소나 생성에 실패했습니다. 입력을 바꿔 다시 시도해주세요."
        );
      } else {
        // 3. 사용하지 않은 크레딧 환불
        const actualCost = generatedCharacters.length * IMAGE_CREDIT_COST;
        const refundAmount = estimatedCost - actualCost;
        if (refundAmount > 0) {
          await refundCredits(refundAmount);
        }

        setCharacters(generatedCharacters);
        setPersonaError(`✅ 페르소나 ${generatedCharacters.length}개 생성 완료`);
        setTimeout(() => saveDataToStorage(true), 100);
      }
    } catch (e) {
      // 오류 발생 시 크레딧 환불
      if (creditDeducted) {
        await refundCredits(estimatedCost);
      }
      console.error("[개발자용] 페르소나 생성 오류:", e);
      const message =
        e instanceof Error
          ? e.message
          : "페르소나 생성 중 오류가 발생했습니다.";
      setPersonaError(message.startsWith('❌') || message.startsWith('✅') ? message : `❌ ${message}`);
    } finally {
      setIsLoadingCharacters(false);
      setLoadingProgress("");
    }
  }, [
    apiKey,
    personaInput,
    imageStyle,
    aspectRatio,
    personaStyle,
    customStyle,
    photoComposition,
    customPrompt,
    characterStyle,
    backgroundStyle,
    customCharacterStyle,
    customBackgroundStyle,
    personaReferenceImage,
    checkAndReplaceContent,
    saveDataToStorage,
  ]);

  const handleRegenerateCharacter = useCallback(
    async (
      characterId: string,
      description: string,
      name: string,
      customPrompt?: string
    ) => {
      if (!apiKey.trim()) {
        setPersonaError(
          "서버 API 키가 설정되지 않았습니다. 관리자에게 문의해주세요."
        );
        return;
      }
      try {
        await deductCredits(IMAGE_CREDIT_COST);
        const mergedDescription = customPrompt
          ? `${description}\n추가 요청: ${customPrompt}`
          : description;
        const newImage = await regenerateCharacterImage(
          mergedDescription,
          name,
          apiKey,
          imageStyle,
          aspectRatio,
          personaStyle
        );
        setCharacters((prev) =>
          prev.map((char) =>
            char.id === characterId ? { ...char, image: newImage } : char
          )
        );
        setPersonaError(`✅ ${name} 이미지가 업데이트되었습니다.`);
        setTimeout(() => saveDataToStorage(true), 100);
      } catch (e) {
        console.error("[개발자용] 페르소나 재생성 오류:", e);
        const message =
          e instanceof Error ? e.message : "페르소나 재생성에 실패했습니다.";
        setPersonaError(message.startsWith('❌') || message.startsWith('✅') ? message : `❌ ${message}`);
      }
    },
    [apiKey, imageStyle, aspectRatio, personaStyle, saveDataToStorage]
  );

  const handleGenerateVideoSource = useCallback(async () => {
    if (!apiKey.trim()) {
      setError("서버 API 키가 설정되지 않았습니다. 관리자에게 문의해주세요.");
      return;
    }
    if (!videoSourceScript.trim()) {
      setError("영상 소스 대본을 입력해주세요.");
      return;
    }
    if (characters.length === 0 && !referenceImage) {
      setError("페르소나를 생성하거나 참조 이미지를 업로드해주세요.");
      return;
    }

    const isSafe = checkAndReplaceContent(videoSourceScript);
    if (!isSafe) {
      setIsContentWarningAcknowledged(false);
      return;
    }

    setIsLoadingVideoSource(true);
    setError(null);
    setVideoSource([]);
    setLoadingProgress("대본 분석 중...");

    try {
      await deductCredits(imageCount * IMAGE_CREDIT_COST);
      const generatedVideoSource = await generateStoryboard(
        videoSourceScript,
        characters,
        imageCount,
        apiKey,
        imageStyle,
        subtitleEnabled,
        referenceImage,
        aspectRatio,
        (progress) => setLoadingProgress(progress)
      );

      setVideoSource(generatedVideoSource);
      setTimeout(() => saveDataToStorage(true), 100);
    } catch (e) {
      console.error("[개발자용] 영상 소스 생성 오류:", e);
      const message =
        e instanceof Error
          ? e.message
          : "영상 소스 생성 중 오류가 발생했습니다.";
      setError(message.startsWith('❌') || message.startsWith('✅') ? message : `❌ ${message}`);
    } finally {
      setIsLoadingVideoSource(false);
      setLoadingProgress("");
    }
  }, [
    apiKey,
    videoSourceScript,
    characters,
    imageCount,
    imageStyle,
    subtitleEnabled,
    referenceImage,
    aspectRatio,
    checkAndReplaceContent,
    saveDataToStorage,
  ]);

  const handleRegenerateVideoSourceImage = useCallback(
    async (storyboardItemId: string, customPrompt?: string) => {
      if (!apiKey.trim()) {
        setError("서버 API 키가 설정되지 않았습니다. 관리자에게 문의해주세요.");
        return;
      }

      const target = videoSource.find((item) => item.id === storyboardItemId);
      if (!target) return;

      try {
        await deductCredits(IMAGE_CREDIT_COST);
        const mergedScene = customPrompt
          ? `${target.sceneDescription}\n추가 요청: ${customPrompt}`
          : target.sceneDescription;
        const newImage = await regenerateStoryboardImage(
          mergedScene,
          characters,
          apiKey,
          imageStyle,
          subtitleEnabled,
          referenceImage,
          aspectRatio
        );

        setVideoSource((prev) =>
          prev.map((item) =>
            item.id === storyboardItemId ? { ...item, image: newImage } : item
          )
        );
        setTimeout(() => saveDataToStorage(true), 100);
      } catch (e) {
        console.error("[개발자용] 영상 소스 재생성 오류:", e);
        const message =
          e instanceof Error ? e.message : "영상 소스 재생성에 실패했습니다.";
        setError(message.startsWith('❌') || message.startsWith('✅') ? message : `❌ ${message}`);
      }
    },
    [
      apiKey,
      videoSource,
      characters,
      imageStyle,
      subtitleEnabled,
      referenceImage,
      aspectRatio,
      saveDataToStorage,
    ]
  );

  const handleGenerateCameraAngles = useCallback(async () => {
    if (!apiKey.trim()) {
      setCameraAngleError(
        "서버 API 키가 설정되지 않았습니다. 관리자에게 문의해주세요."
      );
      return;
    }
    if (!cameraAngleSourceImage) {
      setCameraAngleError("원본 이미지를 업로드해주세요.");
      return;
    }
    if (selectedCameraAngles.length === 0) {
      setCameraAngleError("생성할 앵글을 최소 1개 이상 선택해주세요.");
      return;
    }

    setIsLoadingCameraAngles(true);
    setCameraAngleError(null);
    setCameraAngles([]);
    setCameraAngleProgress("원본 이미지 분석 중...");

    try {
      await deductCredits(selectedCameraAngles.length * IMAGE_CREDIT_COST);
      const generatedAngles = await generateCameraAngles(
        cameraAngleSourceImage,
        selectedCameraAngles,
        apiKey,
        aspectRatio,
        (message, current, total) => {
          setCameraAngleProgress(`${message} (${current}/${total})`);
        }
      );

      setCameraAngles(generatedAngles);
      setTimeout(() => saveDataToStorage(true), 100);

      const successCount = generatedAngles.filter(
        (angle) => angle.image && angle.image.trim() !== ""
      ).length;
      const totalSelected = selectedCameraAngles.length;

      if (successCount === 0) {
        setCameraAngleError(
          "모든 앵글 생성에 실패했습니다. 잠시 후 다시 시도해주세요."
        );
      } else if (successCount < totalSelected) {
        setCameraAngleError(
          `⚠️ ${successCount}/${totalSelected}개 앵글만 생성되었습니다. 실패한 앵글은 다시 시도해주세요.`
        );
      }
    } catch (e) {
      console.error("[개발자용] 카메라 앵글 생성 오류:", e);
      const message =
        e instanceof Error
          ? e.message
          : "카메라 앵글 생성 중 오류가 발생했습니다.";
      setCameraAngleError(message);
    } finally {
      setIsLoadingCameraAngles(false);
      setCameraAngleProgress("");
    }
  }, [
    apiKey,
    cameraAngleSourceImage,
    selectedCameraAngles,
    aspectRatio,
    saveDataToStorage,
  ]);

  const handleResetAll = useCallback(() => {
    try {
      localStorage.removeItem("youtube_image_work_data");
    } catch (storageError) {
      console.error("? localStorage 정리 실패:", storageError);
    }
    try {
      sessionStorage.removeItem("youtube_image_work_data");
    } catch (storageError) {
      console.error("? sessionStorage 정리 실패:", storageError);
    }

    setCharacters([]);
    setVideoSource([]);
    setPersonaInput("");
    setVideoSourceScript("");
    setPersonaReferenceImage(null);
    setReferenceImage(null);
    setImageStyle("realistic");
    setPersonaStyle("실사 극대화");
    setCharacterStyle("실사 극대화");
    setBackgroundStyle("모던");
    setCustomCharacterStyle("");
    setCustomBackgroundStyle("");
    setCustomStyle("");
    setPhotoComposition("정면");
    setCustomPrompt("");
    setAspectRatio("16:9");
    setImageCount(5);
    setSubtitleEnabled(false);
    setError(null);
    setPersonaError(null);
    setContentWarning(null);
    setHasContentWarning(false);
    setIsContentWarningAcknowledged(false);
    setCameraAngleSourceImage(null);
    setSelectedCameraAngles([
      "Front View",
      "Right Side View",
      "Left Side View",
      "Back View",
      "Full Body",
      "Close-up Face",
    ]);
    setCameraAngles([]);
    setCameraAngleError(null);
    setCameraAngleProgress("");
  }, []);

  const handleDownloadAllImages = useCallback(async () => {
    if (videoSource.length === 0) return;

    setIsDownloading(true);
    setError(null);

    let successCount = 0;
    let cancelCount = 0;

    try {
      // 각 이미지를 순차적으로 다운로드
      for (let index = 0; index < videoSource.length; index++) {
        const item = videoSource[index];
        const safeDescription = item.sceneDescription
          .replace(/[^a-zA-Z0-9ㄱ-ㅎㅏ-ㅣ가-힣]/g, "_")
          .substring(0, 30);
        const fileName = `장면_${index + 1}_${safeDescription}.jpg`;

        try {
          // Base64를 Blob으로 변환
          const base64Response = await fetch(`data:image/jpeg;base64,${item.image}`);
          const blob = await base64Response.blob();

          // File System Access API 지원 확인
          if ('showSaveFilePicker' in window) {
            try {
              const handle = await (window as any).showSaveFilePicker({
                suggestedName: fileName,
                types: [
                  {
                    description: '이미지 파일',
                    accept: {
                      'image/jpeg': ['.jpg', '.jpeg'],
                    },
                  },
                ],
              });

              const writable = await handle.createWritable();
              await writable.write(blob);
              await writable.close();
              successCount++;
            } catch (err: any) {
              if (err.name === 'AbortError') {
                // 사용자가 이 파일 저장을 취소함
                cancelCount++;
                console.log(`[${index + 1}/${videoSource.length}] 사용자가 저장을 취소했습니다.`);
              } else {
                throw err;
              }
            }
          } else {
            // 폴백: 기존 다운로드 방식
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            successCount++;

            // 자동 다운로드 시 약간의 딜레이
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (err) {
          console.error(`[개발자] 이미지 ${index + 1} 다운로드 오류:`, err);
          throw err;
        }
      }

      // 다운로드 완료 메시지
      if (successCount > 0) {
        setError(`? ${successCount}개의 이미지가 저장되었습니다!` +
          (cancelCount > 0 ? ` (${cancelCount}개 취소됨)` : ''));
      } else if (cancelCount > 0) {
        setError(`모든 다운로드가 취소되었습니다.`);
      }
    } catch (e) {
      console.error("[개발자] 이미지 다운로드 오류:", e);

      // 사용자용 오류 메시지
      let userMessage = "파일 다운로드에 실패했습니다. 다시 시도해 주세요.";

      if (e instanceof Error) {
        console.error(`[개발자] 오류 상세: ${e.name} - ${e.message}`);

        if (e.name === 'NotAllowedError') {
          userMessage = "파일 저장 권한이 거부되었습니다. 브라우저 설정을 확인해 주세요.";
        } else if (e.name === 'SecurityError') {
          userMessage = "보안 문제로 파일을 저장할 수 없습니다. 브라우저를 업데이트하거나 다른 브라우저를 사용해 주세요.";
        }
      }

      setError(userMessage);
    } finally {
      setIsDownloading(false);
    }
  }, [videoSource]);

  // 라우팅 처리
  if (currentView === "user-guide") {
    return (
      <>
        <MetaTags
          title="유튜브 이미지 생성기 사용법 가이드 - AI로 콘텐츠 제작하기"
          description="AI를 활용하여 유튜브 페르소나와 영상 소스를 생성하는 방법을 상세히 알려드립니다. 단계별 가이드로 쉽게 따라하세요."
          url={`${normalizedBasePath || "/image"}/user-guide`}
          image="/user-guide-preview.png"
          type="article"
        />
        <UserGuide
          onBack={() => navigateToView("main")}
        />
      </>
    );
  }

  return (
    <>
      {!noAds && <AdBlockDetector />}
      <MetaTags
        title="유튜브 롱폼 이미지 생성기 - AI로 캐릭터와 스토리보드 만들기"
        description="Google Gemini AI를 활용해 유튜브 콘텐츠용 페르소나와 영상 소스를 쉽고 빠르게 생성하세요. 다양한 비율(9:16, 16:9, 1:1) 지원."
        url={normalizedBasePath || "/image"}
        image="/og-image.png"
        type="website"
      />
      {!noAds && <SideFloatingAd side="left" />}
      {!noAds && <SideFloatingAd side="right" />}
      <div
        className="min-h-screen bg-gray-900 text-white font-sans p-4 sm:p-6 lg:p-8 relative"
        style={{ paddingBottom: "120px" }}
      >
        <div className="absolute top-0 right-0 p-4 sm:p-6 flex gap-3 z-50 items-center">

        </div>
        <div className="absolute top-0 left-0 p-4 sm:p-6 z-50">
          <HomeBackButton tone="indigo" />
        </div>
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">
              유튜브 롱폼 이미지 생성기
            </h1>
            <p className="mt-2 text-lg text-gray-400">
              일관된 캐릭터와 영상 소스를 자동 생성합니다.
            </p>

            {/* API 키 입력 */}


            {/* 데이터 복원 안내 (복원된 데이터가 있을 때만 표시) */}
            {(characters.length > 0 || videoSource.length > 0 || cameraAngles.length > 0) && (
              <div className="mt-4 bg-blue-900/20 border border-blue-500/50 rounded-lg p-3 max-w-2xl mx-auto">
                <p className="text-blue-300 text-sm flex items-center justify-center">
                  <span className="mr-2">✅</span>
                  이전 작업이 복원되었습니다:
                  {characters.length > 0 && ` 페르소나 ${characters.length}개`}
                  {videoSource.length > 0 && ` | 영상소스 ${videoSource.length}개`}
                  {cameraAngles.length > 0 && ` | 카메라앵글 ${cameraAngles.length}개`}
                </p>
              </div>
            )}

            {/* 네비게이션 링크 */}
            <div className="flex justify-center mt-4 space-x-4">
              <button
                onClick={() => navigateToView("user-guide")}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors"
              >
                사용법
              </button>
            </div>
          </header>

          <main className="space-y-6">
            {!noAds && <AdBanner />}

            <section className="bg-gray-800 p-6 rounded-xl shadow-2xl border-2 border-blue-500">
              <h2 className="text-2xl font-bold mb-4 text-blue-400 flex items-center">
                페르소나 생성
              </h2>
              <div className="mb-4">
                <p className="text-gray-400 text-sm mb-3">
                  구체적인 인물 묘사를 입력하거나, 대본을 넣으면 등장인물들을
                  자동으로 분석하여 생성합니다.
                </p>
                <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4 mb-4">
                  <p className="text-blue-200 text-sm mb-2">
                    <strong>입력 예시:</strong>
                  </p>
                  <ul className="text-blue-300 text-sm space-y-1 ml-4">
                    <li>
                      👤 <strong>인물 묘사:</strong> "20대 중반 여성, 긴 흑발,
                      밝은 미소, 캐주얼한 옷차림"
                    </li>
                    <li>
                      📜 <strong>대본 입력:</strong> 전체 스토리 대본을 넣으면
                      등장인물 자동 추출
                    </li>
                  </ul>
                </div>
              </div>
              <textarea
                value={personaInput}
                onChange={(e) => setPersonaInput(e.target.value)}
                placeholder="인물 묘사나 대본을 입력하세요..."
                className="w-full h-48 p-4 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 resize-y mb-6"
              />

              {/* 이미지 스타일 선택 */}
              <div className="mb-6 bg-blue-900/20 border border-blue-500/50 rounded-lg p-6">
                <h3 className="text-blue-300 font-medium mb-6 flex items-center">
                  <span className="mr-2">🎨</span>
                  이미지 스타일 선택
                </h3>

                {/* 인물 스타일 */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-blue-200 font-medium flex items-center text-sm">
                      <span className="mr-2">👤</span>
                      인물 스타일
                    </h4>
                    <button
                      onClick={() => setCharacterStyle("custom")}
                      className={`py-1.5 px-4 rounded-lg font-medium text-xs transition-all duration-200 ${characterStyle === "custom"
                        ? "bg-blue-600 text-white shadow-lg scale-105"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        }`}
                    >
                      직접 입력
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {(
                      [
                        "실사 극대화",
                        "애니메이션",
                        "동물",
                        "웹툰",
                      ] as CharacterStyle[]
                    ).map((style) => {
                      const styleDescriptions: Record<CharacterStyle, string> =
                      {
                        "실사 극대화":
                          "📸 초현실적이고 사진 같은 퀄리티의 실사 인물",
                        애니메이션: "🎨 밝고 화려한 애니메이션 스타일 캐릭터",
                        동물: "🐾 귀여운 동물 캐릭터로 변환",
                        웹툰: "🖊️ 깨끗한 선과 표현력 풍부한 한국 웹툰 스타일",
                        custom: "",
                      };

                      return (
                        <div key={style} className="relative">
                          <button
                            onClick={() => setCharacterStyle(style)}
                            className={`relative w-full h-32 rounded-lg font-medium text-sm transition-all duration-200 overflow-hidden group ${characterStyle === style
                              ? "ring-4 ring-blue-500 shadow-2xl scale-105"
                              : "hover:scale-105 hover:ring-2 hover:ring-blue-400"
                              }`}
                            style={{
                              backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('/${style}.png')`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center'
                            }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                            <div className="relative h-full flex flex-col justify-end p-3">
                              <div className="text-white font-bold text-base mb-1">{style}</div>
                              <div className="text-gray-200 text-xs leading-tight">
                                {styleDescriptions[style]}
                              </div>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {characterStyle === "custom" && (
                    <input
                      type="text"
                      value={customCharacterStyle}
                      onChange={(e) => setCustomCharacterStyle(e.target.value)}
                      placeholder="원하는 인물 스타일을 입력하세요 (예: 르네상스, 빅토리아 시대 등)"
                      className="w-full p-3 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors mt-3"
                    />
                  )}
                </div>

                {/* 배경/분위기 스타일 */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-blue-200 font-medium flex items-center text-sm">
                      <span className="mr-2">🌆</span>
                      배경/분위기 스타일
                    </h4>
                    <button
                      onClick={() => setBackgroundStyle("custom")}
                      className={`py-1.5 px-4 rounded-lg font-medium text-xs transition-all duration-200 ${backgroundStyle === "custom"
                        ? "bg-blue-600 text-white shadow-lg scale-105"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        }`}
                    >
                      직접 입력
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
                    {(
                      [
                        "감성 멜로",
                        "서부극",
                        "공포 스릴러",
                        "사이버펑크",
                        "판타지",
                        "미니멀",
                        "빈티지",
                        "모던",
                        "1980년대",
                        "2000년대",
                        "먹방",
                        "귀여움",
                        "AI",
                        "괴이함",
                        "창의적인",
                        "조선시대",
                      ] as BackgroundStyle[]
                    ).map((style) => {
                      const styleDescriptions: Record<BackgroundStyle, string> =
                      {
                        "감성 멜로": "💞 로맨틱하고 감성적인 따뜻한 분위기",
                        서부극: "🤠 거친 사막과 카우보이 배경",
                        "공포 스릴러": "👻 미스터리하고 긴장감 있는 분위기",
                        사이버펑크: "🌃 네온사인 가득한 미래 도시",
                        판타지: "🧙‍♂️ 마법적이고 신비로운 중세 배경",
                        미니멀: "⬜ 깔끔하고 단순한 중성톤 배경",
                        빈티지: "🕰️ 클래식하고 향수를 자아내는 배경",
                        모던: "🏙️ 현대적이고 세련된 도시 배경",
                        "1980년대": "📻 80년대 레트로 패션과 분위기",
                        "2000년대": "💿 2000년대 초반 감성과 스타일",
                        먹방: "🍜 맛있는 음식이 가득한 먹방 분위기",
                        귀여움: "🐰 귀엽고 사랑스러운 파스텔 감성",
                        AI: "🤖 미래지향적인 하이테크 AI 분위기",
                        괴이함: "🌀 독특하고 초현실적인 기묘한 분위기",
                        창의적인: "✨ 상상력 넘치는 독창적인 예술 분위기",
                        조선시대: "🏯 한옥과 전통 가옥, 따뜻하고 감성적인 조선 분위기",
                        custom: "",
                      };

                      return (
                        <div key={style} className="relative">
                          <button
                            onClick={() => setBackgroundStyle(style)}
                            className={`relative w-full h-32 rounded-lg font-medium text-sm transition-all duration-200 overflow-hidden group ${backgroundStyle === style
                              ? "ring-4 ring-blue-500 shadow-2xl scale-105"
                              : "hover:scale-105 hover:ring-2 hover:ring-blue-400"
                              }`}
                            style={{
                              backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('/${style === "AI" ? "ai" : style}.png')`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center'
                            }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                            <div className="relative h-full flex flex-col justify-end p-3">
                              <div className="text-white font-bold text-base mb-1">{style}</div>
                              <div className="text-gray-200 text-xs leading-tight">
                                {styleDescriptions[style]}
                              </div>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {backgroundStyle === "custom" && (
                    <input
                      type="text"
                      value={customBackgroundStyle}
                      onChange={(e) => setCustomBackgroundStyle(e.target.value)}
                      placeholder="원하는 배경/분위기를 입력하세요 (예: 우주 정거장, 열대 해변 등)"
                      className="w-full p-3 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors mt-3"
                    />
                  )}
                </div>
              </div>

              {/* 사진 설정 (구도 및 비율) */}
              <div className="mb-6 bg-blue-900/20 border border-blue-500/50 rounded-lg p-6">
                <h3 className="text-blue-300 font-medium mb-4 flex items-center">
                  <span className="mr-2">📷</span>
                  사진 설정
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 왼쪽: 사진 구도 선택 */}
                  <div>
                    <label className="block text-blue-200 text-sm font-medium mb-2">
                      사진 구도
                    </label>
                    <select
                      value={photoComposition}
                      onChange={(e) =>
                        setPhotoComposition(e.target.value as PhotoComposition)
                      }
                      className="w-full p-3 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-white"
                    >
                      <option value="정면">정면 (기본)</option>
                      <option value="측면">측면</option>
                      <option value="반측면">반측면</option>
                      <option value="위에서">위에서</option>
                      <option value="아래에서">아래에서</option>
                      <option value="전신">전신</option>
                      <option value="상반신">상반신</option>
                      <option value="클로즈업">클로즈업</option>
                    </select>
                  </div>

                  {/* 오른쪽: 이미지 비율 선택 */}
                  <div>
                    <label className="block text-blue-200 text-sm font-medium mb-2">
                      이미지 비율
                    </label>
                    <select
                      value={aspectRatio}
                      onChange={(e) =>
                        setAspectRatio(e.target.value as AspectRatio)
                      }
                      className="w-full p-3 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-white"
                    >
                      <option value="9:16">📱 9:16 - 모바일 세로</option>
                      <option value="16:9">🖥️ 16:9 - 데스크톱 가로</option>
                      <option value="1:1">⬜ 1:1 - 정사각형</option>
                    </select>
                  </div>
                </div>

                <div className="text-xs text-gray-400 mt-3">
                  💡 사진 구도와 이미지 비율을 조합하여 원하는 스타일의 이미지를
                  만드세요.
                </div>
              </div>

              {/* 스타일 참조 이미지 업로드 (선택사항) */}
              <div className="mb-6 bg-blue-900/20 border border-blue-500/50 rounded-lg p-6">
                <h3 className="text-blue-300 font-medium mb-4 flex items-center">
                  <span className="mr-2">🖼️</span>
                  스타일 참조 이미지 (선택사항)
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  원하는 스타일의 사진을 업로드하면 해당 스타일을 참고하여
                  페르소나를 생성합니다.
                </p>

                {!personaReferenceImage ? (
                  <label className="block w-full cursor-pointer">
                    <div className="border-2 border-dashed border-blue-500 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-900/10 transition-all">
                      <div className="text-blue-300 text-4xl mb-3">🖼️</div>
                      <p className="text-blue-200 font-medium mb-1">
                        참조 이미지 업로드
                      </p>
                      <p className="text-gray-400 text-sm">
                        클릭하여 이미지 선택 (JPG, PNG)
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const base64 = (
                                event.target?.result as string
                              ).split(",")[1];
                              setPersonaReferenceImage(base64);
                            };
                            reader.readAsDataURL(file);
                          } catch (error) {
                            console.error("이미지 로드 실패:", error);
                            setError("이미지를 불러오는데 실패했습니다.");
                          }
                        }
                      }}
                    />
                  </label>
                ) : (
                  <div className="relative">
                    <img
                      src={`data:image/jpeg;base64,${personaReferenceImage}`}
                      alt="참조 이미지"
                      className="w-full max-h-64 object-contain rounded-lg border-2 border-blue-500"
                    />
                    <button
                      onClick={() => setPersonaReferenceImage(null)}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                    >
                      ? 삭제
                    </button>
                    <p className="text-blue-400 text-sm mt-2 flex items-center">
                      <span className="mr-2">✅</span>
                      참조 이미지가 업로드되었습니다
                    </p>
                  </div>
                )}
              </div>

              {/* 커스텀 프롬프트 (선택사항) */}
              <div className="mb-6 bg-blue-900/20 border border-blue-500/50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-blue-300 font-medium flex items-center">
                    <span className="mr-2">✏️</span>
                    커스텀 이미지 프롬프트 (선택사항)
                  </h3>
                  <button
                    onClick={() => {
                      window.open("https://gemini.google.com/share/56de66e939ff", "_blank", "noopener,noreferrer");
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold rounded-lg text-sm transition-all duration-200 transform hover:scale-105 flex items-center"
                  >
                    <span className="mr-2">💡</span>
                    내가 원하는 이미지 200% 뽑는 노하우
                  </button>
                </div>

                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="고급 사용자용: AI에게 전달할 구체적인 이미지 프롬프트를 직접 입력하세요 (영어 권장)"
                  className="w-full h-24 p-3 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-y"
                />
                <p className="text-gray-400 text-xs mt-2">
                  ℹ️ 이 필드는 고급 사용자를 위한 기능입니다. 비워두면 자동으로
                  최적화된 프롬프트가 생성됩니다.
                </p>
              </div>

              {/* 콘텐츠 정책 위반 경고 */}
              {contentWarning && !isContentWarningAcknowledged && (
                <div className="mt-4 bg-blue-900/50 border border-blue-500 text-blue-300 p-4 rounded-lg">
                  <div className="flex items-start">
                    <span className="text-orange-400 text-xl mr-3">⚠️</span>
                    <div className="flex-1">
                      <p className="font-medium mb-2">
                        콘텐츠 정책 위반 가능성이 있는 단어가 감지되었습니다
                      </p>
                      <div className="mb-3">
                        <p className="text-sm text-orange-200 mb-2">
                          감지된 단어:
                        </p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {contentWarning.unsafeWords.map((word, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-orange-800/50 rounded text-sm"
                            >
                              "{word}"
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={handleAutoReplace}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center"
                        >
                          ✅ 안전한 단어로 자동 교체
                        </button>
                        <button
                          onClick={handleAcknowledgeWarning}
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          무시하고 계속
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleGeneratePersonas}
                disabled={
                  isLoadingCharacters ||
                  !personaInput.trim() ||
                  !apiKey.trim() ||
                  (hasContentWarning && !isContentWarningAcknowledged)
                }
                className="mt-4 w-full sm:w-auto px-6 py-3 bg-blue-600 font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 flex items-center justify-center"
              >
                {isLoadingCharacters ? (
                  <>
                    <Spinner size="sm" />{" "}
                    <span className="ml-2">페르소나 생성 중...</span>
                  </>
                ) : (
                  "페르소나 생성 (5 ⚡)"
                )}
              </button>
            </section>

            {/* 페르소나 생성 관련 오류/성공 메시지 표시 */}
            {personaError && (
              <div
                className={
                  personaError.startsWith("?")
                    ? "bg-blue-900/50 border border-blue-500 text-blue-300 p-4 rounded-lg"
                    : "bg-red-900/50 border border-red-500 text-red-300 p-4 rounded-lg"
                }
              >
                <div className="flex items-start">
                  <span
                    className={
                      personaError.startsWith("?")
                        ? "text-blue-400 text-xl mr-3"
                        : "text-red-400 text-xl mr-3"
                    }
                  >
                    {personaError.startsWith("✅") ? "✅" : "❌"}
                  </span>
                  <div className="flex-1">
                    <pre className="font-medium mb-2 whitespace-pre-wrap text-sm leading-relaxed">{personaError}</pre>
                    <button
                      onClick={() => setPersonaError(null)}
                      className={
                        personaError.startsWith("?")
                          ? "mt-3 text-blue-400 hover:text-blue-300 text-sm underline"
                          : "mt-3 text-red-400 hover:text-red-300 text-sm underline"
                      }
                    >
                      오류 메시지 닫기
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isLoadingCharacters && (
              <div className="text-center p-8">
                <Spinner size="lg" />
                <p className="mt-4 text-blue-300 text-lg font-semibold">
                  등장인물을 분석하고 이미지를 생성하고 있습니다...
                </p>
                {loadingProgress && (
                  <div className="mt-4 bg-blue-900/30 border border-blue-500/50 rounded-lg p-4 max-w-md mx-auto">
                    <p className="text-blue-300 font-bold text-lg animate-pulse">
                      ⏳ {loadingProgress}
                    </p>
                  </div>
                )}
                <p className="mt-4 text-gray-400 text-sm">
                  ℹ️ API 과부하 방지를 위해 캐릭터 간 3-4초 대기 시간이 있습니다.
                </p>
                <p className="mt-2 text-gray-500 text-xs">
                  잠시만 기다려 주세요. 고품질 이미지를 생성하는 중입니다.
                </p>
              </div>
            )}

            {characters.length > 0 && (
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-blue-300">
                    생성된 페르소나 ({characters.length}개)</h2>
                  </div>
                </section>
              )}
            </main>
          </div>
        </div>
      </>
    );
  };