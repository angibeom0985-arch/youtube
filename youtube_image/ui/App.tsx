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

type ImageAppView = "main" | "user-guide" | "image-prompt";

interface ImageAppProps {
  basePath?: string;
  initialScript?: string;
}

const IMAGE_CREDIT_COST = 5;

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

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
  const [imageStyle, setImageStyle] = useState<"realistic" | "animation">(
    "realistic"
  ); // ê¸°ì¡´ ?´ë?ì§€ ?¤í???(?¤ì‚¬/? ë‹ˆë©”ì´??
  const [personaStyle, setPersonaStyle] = useState<ImageStyle>("?¤ì‚¬ ê·¹ë???); // ê¸°ì¡´ ?˜ë¥´?Œë‚˜ ?¤í???(?¸í™˜??? ì?)
  const [characterStyle, setCharacterStyle] =
    useState<CharacterStyle>("?¤ì‚¬ ê·¹ë???); // ?¸ë¬¼ ?¤í???
  const [backgroundStyle, setBackgroundStyle] =
    useState<BackgroundStyle>("ëª¨ë˜"); // ë°°ê²½/ë¶„ìœ„ê¸??¤í???
  const [customCharacterStyle, setCustomCharacterStyle] = useState<string>(""); // ì»¤ìŠ¤?€ ?¸ë¬¼ ?¤í???
  const [customBackgroundStyle, setCustomBackgroundStyle] =
    useState<string>(""); // ì»¤ìŠ¤?€ ë°°ê²½ ?¤í???
  const [customStyle, setCustomStyle] = useState<string>(""); // ì»¤ìŠ¤?€ ?¤í????…ë ¥ (ê¸°ì¡´ ?¸í™˜??
  const [photoComposition, setPhotoComposition] =
    useState<PhotoComposition>("?•ë©´"); // ?¬ì§„ êµ¬ë„
  const [customPrompt, setCustomPrompt] = useState<string>(""); // ì»¤ìŠ¤?€ ?´ë?ì§€ ?„ë¡¬?„íŠ¸
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9"); // ?´ë?ì§€ ë¹„ìœ¨ ? íƒ
  const [personaInput, setPersonaInput] = useState<string>(""); // ?˜ë¥´?Œë‚˜ ?ì„±???…ë ¥
  const [videoSourceScript, setVideoSourceScript] = useState<string>(""); // ?ìƒ ?ŒìŠ¤???€ë³?
  const [subtitleEnabled, setSubtitleEnabled] = useState<boolean>(false); // ?ë§‰ ?¬í•¨ ?¬ë? - ê¸°ë³¸ OFF
  const [personaReferenceImage, setPersonaReferenceImage] = useState<
    string | null
  >(null); // ?˜ë¥´?Œë‚˜??ì°¸ì¡° ?´ë?ì§€ (? íƒ?¬í•­)
  const [referenceImage, setReferenceImage] = useState<string | null>(null); // ?ìƒ ?ŒìŠ¤??ì°¸ì¡° ?´ë?ì§€
  const [characters, setCharacters] = useState<Character[]>([]);
  const [videoSource, setVideoSource] = useState<VideoSourceImage[]>([]);
  const [imageCount, setImageCount] = useState<number>(5);
  const [isLoadingCharacters, setIsLoadingCharacters] =
    useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<string>(""); // ë¡œë”© ì§„í–‰ ?í™© ë©”ì‹œì§€
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
  
  // ì¹´ë©”???µê? ê¸°ëŠ¥ ê´€??state
  const [cameraAngleSourceImage, setCameraAngleSourceImage] = useState<string | null>(null);
  const [selectedCameraAngles, setSelectedCameraAngles] = useState<CameraAngle[]>([
    'Front View', 'Right Side View', 'Left Side View', 'Back View', 'Full Body', 'Close-up Face'
  ]); // ê¸°ë³¸ê°? ?„ì²´ ? íƒ
  const [cameraAngles, setCameraAngles] = useState<CameraAngleImage[]>([]);
  const [isLoadingCameraAngles, setIsLoadingCameraAngles] = useState<boolean>(false);
  const [cameraAngleProgress, setCameraAngleProgress] = useState<string>("");
  const [cameraAngleError, setCameraAngleError] = useState<string | null>(null);

  const getAuthHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return { headers, token };
  }, []);

  const deductCredits = useCallback(async (cost: number) => {
    const { headers, token } = await getAuthHeaders();
    if (!token) {
      throw new Error("ë¡œê·¸?¸ì´ ?„ìš”???œë¹„?¤ì…?ˆë‹¤.");
    }
    const response = await fetch("/api/YOUTUBE/user/credits-deduct", {
      method: "POST",
      headers,
      body: JSON.stringify({ cost }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.message || "?¬ë ˆ??ì°¨ê°???¤íŒ¨?ˆìŠµ?ˆë‹¤.");
    }
    window.dispatchEvent(new Event("creditRefresh"));
  }, [getAuthHeaders]);

  // URL ê¸°ë°˜ ?„ì¬ ë·?ê²°ì •
  useEffect(() => {
    const path = decodeURIComponent(location.pathname);
    const relativePath =
      normalizedBasePath && path.startsWith(normalizedBasePath)
        ? path.slice(normalizedBasePath.length) || "/"
        : path;

    if (
      relativePath === "/user-guide" ||
      (relativePath.includes("?¬ìš©ë²?) && relativePath.includes("ê°€?´ë“œ"))
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

  // ì»´í¬?ŒíŠ¸ ë§ˆìš´?????€?¥ëœ ?‘ì—… ?°ì´??ë¶ˆëŸ¬?¤ê¸° (localStorage ?°ì„ , ?†ìœ¼ë©?sessionStorage)
  useEffect(() => {
    try {
      let savedData = localStorage.getItem("youtube_image_work_data");
      let source = "localStorage";
      
      // localStorage???†ìœ¼ë©?sessionStorage ?•ì¸
      if (!savedData) {
        savedData = sessionStorage.getItem("youtube_image_work_data");
        source = "sessionStorage";
      }
      
      console.log(`?”„ ${source}?ì„œ ?°ì´??ë¶ˆëŸ¬?¤ê¸° ?œë„...`, savedData ? `${savedData.length} bytes` : "?†ìŒ");
      
      if (savedData) {
        const parsed = JSON.parse(savedData);
        console.log("?“¦ ?Œì‹±???°ì´??", {
          characters: parsed.characters?.length || 0,
          videoSource: parsed.videoSource?.length || 0,
          cameraAngles: parsed.cameraAngles?.length || 0,
          savedAt: parsed.savedAt,
          version: parsed.version,
        });
        
        // ë³µì›????ª© ì¹´ìš´??
        let restoredCount = 0;
        const restoredItems: string[] = [];
        
        if (parsed.characters && parsed.characters.length > 0) {
          setCharacters(parsed.characters);
          restoredCount++;
          restoredItems.push(`?˜ë¥´?Œë‚˜: ${parsed.characters.length}ê°?);
          console.log("? ?˜ë¥´?Œë‚˜ ë³µì›:", parsed.characters.length, "ê°?);
        }
        if (parsed.videoSource && parsed.videoSource.length > 0) {
          setVideoSource(parsed.videoSource);
          restoredCount++;
          restoredItems.push(`?ìƒ?ŒìŠ¤: ${parsed.videoSource.length}ê°?);
          console.log("? ?ìƒ ?ŒìŠ¤ ë³µì›:", parsed.videoSource.length, "ê°?);
        }
        if (parsed.cameraAngles && parsed.cameraAngles.length > 0) {
          setCameraAngles(parsed.cameraAngles);
          restoredCount++;
          restoredItems.push(`ì¹´ë©”?¼ì•µê¸€: ${parsed.cameraAngles.length}ê°?);
          console.log("? ì¹´ë©”???µê? ë³µì›:", parsed.cameraAngles.length, "ê°?);
        }
        
        // ?¤ì • ë³µì›
        if (parsed.personaInput) setPersonaInput(parsed.personaInput);
        if (parsed.videoSourceScript)
          setVideoSourceScript(parsed.videoSourceScript);
        if (parsed.personaReferenceImage) {
          setPersonaReferenceImage(parsed.personaReferenceImage);
          restoredItems.push("?˜ë¥´?Œë‚˜ ì°¸ì¡° ?´ë?ì§€ ?");
          console.log("? ?˜ë¥´?Œë‚˜ ì°¸ì¡° ?´ë?ì§€ ë³µì›");
        }
        if (parsed.referenceImage) {
          setReferenceImage(parsed.referenceImage);
          restoredItems.push("?ìƒ?ŒìŠ¤ ì°¸ì¡° ?´ë?ì§€ ?");
          console.log("? ?ìƒ?ŒìŠ¤ ì°¸ì¡° ?´ë?ì§€ ë³µì›");
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
          restoredItems.push("ì¹´ë©”?¼ì•µê¸€ ?ë³¸ ?´ë?ì§€ ?");
          console.log("? ì¹´ë©”???µê? ?ë³¸ ?´ë?ì§€ ë³µì›");
        }
        
        console.log(`???‘ì—… ?°ì´??ë³µì› ?„ë£Œ (from ${source}):`, {
          ?˜ë¥´?Œë‚˜: parsed.characters?.length || 0,
          ?ìƒ?ŒìŠ¤: parsed.videoSource?.length || 0,
          ì¹´ë©”?¼ì•µê¸€: parsed.cameraAngles?.length || 0,
          savedAt: parsed.savedAt ? new Date(parsed.savedAt).toLocaleString('ko-KR') : 'unknown',
        });
        
        // ë³µì› ?±ê³µ ??ì½˜ì†”?ë§Œ ë¡œê·¸ (?Œë¦¼ì°??œê±°)
        if (restoredCount > 0 || restoredItems.length > 0) {
          // ë§ˆì?ë§??‘ì—… ? í˜• ?Œì•… (?€?¥ëœ ê°??°ì„  ?¬ìš©)
          let lastWorkType = parsed.lastWorkType || '';
          
          // lastWorkType???€?¥ë˜ì§€ ?Šì? ê²½ìš° (?´ì „ ë²„ì „ ?¸í™˜??
          if (!lastWorkType) {
            if (parsed.cameraAngles?.length > 0) {
              lastWorkType = 'ì¹´ë©”?¼ì•µê¸€ ë³€??;
            } else if (parsed.videoSource?.length > 0) {
              lastWorkType = '?ìƒ?ŒìŠ¤ ?ì„±';
            } else if (parsed.characters?.length > 0) {
              lastWorkType = '?˜ë¥´?Œë‚˜ ?ì„±';
            }
          }
          
          const savedTime = parsed.savedAt ? new Date(parsed.savedAt).toLocaleString('ko-KR') : '?????†ìŒ';
          
          console.log("??ë³µì› ?„ë£Œ!");
          console.log(`?§¾ ë§ˆì?ë§??‘ì—…: ${lastWorkType}`);
          console.log(`? ?€???œê°: ${savedTime}`);
          console.log(`?“¦ ë³µì›????ª©: ${restoredItems.join(', ')}`);
        } else {
          console.log("?¹ï¸ ë³µì›???‘ì—…ë¬¼ì´ ?†ìŠµ?ˆë‹¤ (?¤ì •ë§?ë³µì›??");
        }
      } else {
        console.log("?¹ï¸ ?€?¥ëœ ?°ì´???†ìŒ (localStorage & sessionStorage ëª¨ë‘)");
      }
    } catch (e) {
      console.error("? ?‘ì—… ?°ì´??ë¶ˆëŸ¬?¤ê¸° ?¤íŒ¨:", e);
      // ?ìƒ???°ì´???? œ
      try {
        localStorage.removeItem("youtube_image_work_data");
      } catch (storageError) {
        console.error("? localStorage ?•ë¦¬ ?¤íŒ¨:", storageError);
      }
      try {
        sessionStorage.removeItem("youtube_image_work_data");
      } catch (storageError) {
        console.error("? sessionStorage ?•ë¦¬ ?¤íŒ¨:", storageError);
      }
      alert("? ï¸ ?€?¥ëœ ?°ì´?°ê? ?ìƒ?˜ì–´ ë¶ˆëŸ¬?????†ìŠµ?ˆë‹¤.\n?ˆë¡œ ?œì‘?´ì£¼?¸ìš”.");
    }
  }, []);

  useEffect(() => {
    const scriptToApply = initialScript || navigationScript;
    if (scriptToApply && !videoSourceScript.trim()) {
      setVideoSourceScript(scriptToApply);
    }
  }, [initialScript, navigationScript, videoSourceScript]);

  // ?€???¨ìˆ˜ë¥?ë³„ë„ë¡?ë¶„ë¦¬ (ì¦‰ì‹œ ?€??ê°€?¥í•˜?„ë¡)
  const saveDataToStorage = useCallback(async (immediate = false) => {
    // ?€?¥í•  ?°ì´?°ê? ?†ìœ¼ë©??¤í‚µ
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
    console.log(`?’¾ [${timestamp}] ?°ì´???€???œì‘${immediate ? ' (ì¦‰ì‹œ ?€??' : ''}:`, {
      ?˜ë¥´?Œë‚˜: characters.length,
      ?ìƒ?ŒìŠ¤: videoSource.length,
      ì¹´ë©”?¼ì•µê¸€: cameraAngles.length
    });
      
    try {
      // ?´ë?ì§€ ?•ì¶• (?©ëŸ‰ ìµœì ??
      console.log(`?—œï¸?[${timestamp}] ?´ë?ì§€ ?•ì¶• ?œì‘...`);
      const compressedCharacters = await Promise.all(
        characters.slice(0, 10).map(async (char, idx) => {
          console.log(`  - ?˜ë¥´?Œë‚˜ #${idx + 1} ?•ì¶• ì¤?..`);
          return {
            ...char,
            image: char.image ? await compressImage(char.image, 600, 0.6) : char.image,
          };
        })
      );
      console.log(`? [${timestamp}] ?˜ë¥´?Œë‚˜ ${compressedCharacters.length}ê°??•ì¶• ?„ë£Œ`);

      const compressedVideoSource = await Promise.all(
        videoSource.slice(0, 10).map(async (source, idx) => {
          console.log(`  - ?ìƒ?ŒìŠ¤ #${idx + 1} ?•ì¶• ì¤?..`);
          return {
            ...source,
            image: source.image ? await compressImage(source.image, 600, 0.6) : source.image,
          };
        })
      );
      console.log(`? [${timestamp}] ?ìƒ?ŒìŠ¤ ${compressedVideoSource.length}ê°??•ì¶• ?„ë£Œ`);

      const compressedCameraAngles = await Promise.all(
        cameraAngles.slice(0, 10).map(async (angle, idx) => {
          console.log(`  - ì¹´ë©”?¼ì•µê¸€ #${idx + 1} ?•ì¶• ì¤?..`);
          return {
            ...angle,
            image: angle.image ? await compressImage(angle.image, 600, 0.6) : angle.image,
          };
        })
      );
      console.log(`? [${timestamp}] ì¹´ë©”?¼ì•µê¸€ ${compressedCameraAngles.length}ê°??•ì¶• ?„ë£Œ`);

      // ë§ˆì?ë§??‘ì—… ? í˜• ê²°ì • (ê°€??ìµœê·¼ ?‘ì—…)
      let lastWorkType = '';
      if (compressedCameraAngles.length > 0) {
        lastWorkType = 'ì¹´ë©”?¼ì•µê¸€ ë³€??;
      } else if (compressedVideoSource.length > 0) {
        lastWorkType = '?ìƒ?ŒìŠ¤ ?ì„±';
      } else if (compressedCharacters.length > 0) {
        lastWorkType = '?˜ë¥´?Œë‚˜ ?ì„±';
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
        version: "1.0.0", // ë²„ì „ ì¶”ê?ë¡??¸í™˜??ê´€ë¦?
      };

      // lastWorkType???ˆëŠ” ê²½ìš°?ë§Œ ì¶”ê?
      if (lastWorkType) {
        dataToSave.lastWorkType = lastWorkType;
      }

      const jsonString = JSON.stringify(dataToSave);
      const sizeInMB = (jsonString.length / 1024 / 1024).toFixed(2);
      console.log(`?’¾ [${timestamp}] ?€?¥í•  ?°ì´???¬ê¸°: ${sizeInMB}MB (${jsonString.length} bytes)`);

      // localStorage ?©ëŸ‰ ì²´í¬ (4MB ?œí•œ)
      if (!canStoreInLocalStorage(jsonString, 4)) {
        console.warn(`? ï¸ [${timestamp}] ?°ì´?°ê? ?ˆë¬´ ì»¤ì„œ ?¼ë?ë§??€?¥í•©?ˆë‹¤.`);
        // ?©ëŸ‰ ì´ˆê³¼ ??ì¹´ë©”???µê? ?œì™¸?˜ê³  ?¬ì‹œ??
        const minimalData = {
          ...dataToSave,
          cameraAngles: [],
        };
        const minimalJsonString = JSON.stringify(minimalData);
        
        if (!canStoreInLocalStorage(minimalJsonString, 4)) {
          console.warn(`? ï¸ [${timestamp}] ?¬ì „???©ëŸ‰ ì´ˆê³¼, ?ìƒ ?ŒìŠ¤???œì™¸?©ë‹ˆ??`);
          const veryMinimalData = {
            ...minimalData,
            videoSource: [],
          };
          localStorage.setItem("youtube_image_work_data", JSON.stringify(veryMinimalData));
          sessionStorage.setItem("youtube_image_work_data", JSON.stringify(veryMinimalData));
          console.log(`? [${timestamp}] ìµœì†Œ ?°ì´?°ë§Œ ?€?¥ë¨ (?˜ë¥´?Œë‚˜ + ?¤ì •)`);
        } else {
          localStorage.setItem("youtube_image_work_data", minimalJsonString);
          sessionStorage.setItem("youtube_image_work_data", minimalJsonString);
          console.log(`? [${timestamp}] ?¼ë? ?°ì´???€?¥ë¨ (ì¹´ë©”???µê? ?œì™¸)`);
        }
      } else {
        localStorage.setItem("youtube_image_work_data", jsonString);
        sessionStorage.setItem("youtube_image_work_data", jsonString);
        console.log(`? [${timestamp}] ?„ì²´ ?°ì´???€???„ë£Œ! (localStorage + sessionStorage ?´ì¤‘ ë°±ì—…)`);
      }
    } catch (e) {
      if (e instanceof Error && e.name === "QuotaExceededError") {
        console.error("? localStorage ?©ëŸ‰ ì´ˆê³¼! ?´ì „ ?°ì´?°ë? ?? œ?©ë‹ˆ??");
        localStorage.removeItem("youtube_image_work_data");
        sessionStorage.removeItem("youtube_image_work_data");
        try {
          // ìµœì†Œ ?°ì´?°ë§Œ ?€??
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
          console.log("? ?¤ì • ?°ì´?°ë§Œ ?€?¥ë¨");
        } catch (retryError) {
          console.error("? ?¬ì‹œ?„ë„ ?¤íŒ¨:", retryError);
        }
      } else {
        console.error("? ?‘ì—… ?°ì´???€???¤íŒ¨:", e);
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

  // ?‘ì—… ?°ì´?°ê? ë³€ê²½ë  ?Œë§ˆ??localStorage + sessionStorage???€??(?´ì¤‘ ë°±ì—…)
  useEffect(() => {
    // ì´ˆê¸° ë§ˆìš´???œì—???€?¥í•˜ì§€ ?ŠìŒ (?°ì´??ë¡œë“œ ?„ì—ë§??€??
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
      return; // ?°ì´?°ê? ?†ìœ¼ë©??€?¥í•˜ì§€ ?ŠìŒ
    }
    
    // debounceë¥??„í•´ ?€?´ë¨¸ ?¬ìš©
    const timer = setTimeout(() => {
      console.log('?’¾ ?ë™ ?€???¸ë¦¬ê±?(1ì´?debounce ??');
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

  // ë³´ì•ˆ: ?œë˜ê·? ?°í´ë¦? ìº¡ì²˜ ë°©ì?
  useEffect(() => {
    // ?…ë ¥ ?„ë“œ?¸ì? ?•ì¸?˜ëŠ” ?¬í¼ ?¨ìˆ˜
    const isInputField = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof HTMLElement)) return false;
      const tagName = target.tagName.toLowerCase();
      return (
        tagName === "input" ||
        tagName === "textarea" ||
        target.isContentEditable
      );
    };

    // ?œë˜ê·? ? íƒ, ?°í´ë¦? ë³µì‚¬ ì°¨ë‹¨ (?…ë ¥ ?„ë“œ ?œì™¸)
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

    // ë§ˆìš°???°í´ë¦?ì°¨ë‹¨ (?œë˜ê·¸í”„ë¦¬ë¥˜ ?°íšŒ ë°©ì?, ?…ë ¥ ?„ë“œ ?œì™¸)
    const blockRightClick = (e: MouseEvent) => {
      if (e.button === 2 && !isInputField(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };
    document.addEventListener("mousedown", blockRightClick, { capture: true });
    document.addEventListener("mouseup", blockRightClick, { capture: true });

    // CSSë¡?? íƒ ë°©ì? (?…ë ¥ ?„ë“œ???¤í??¼ë¡œ ?ˆì™¸ ì²˜ë¦¬)
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
    // ?…ë ¥ ?„ë“œ??? íƒ ê°€?¥í•˜?„ë¡ ?¤í???ì¶”ê?
    const style = document.createElement("style");
    style.textContent = `
      input, textarea, [contenteditable="true"] {
        user-select: text !important;
        -webkit-user-select: text !important;
      }
    `;
    document.head.appendChild(style);

    // ?¤ë³´???¨ì¶•??ì°¨ë‹¨ (?…ë ¥ ?„ë“œ?ì„œ???¸ì§‘ ?¨ì¶•???ˆìš©)
    const blockKeys = (e: KeyboardEvent) => {
      const target = e.target;
      const isInput = isInputField(target);

      // ?…ë ¥ ?„ë“œ?ì„œ??ê¸°ë³¸ ?¸ì§‘ ?¨ì¶•???ˆìš©
      // Ctrl+C (ë³µì‚¬), Ctrl+V (ë¶™ì—¬?£ê¸°), Ctrl+X (?˜ë¼?´ê¸°), Ctrl+A (?„ì²´? íƒ)
      // Ctrl+Z (?˜ëŒë¦¬ê¸°), Ctrl+Y (?¤ì‹œ?¤í–‰), Ctrl+Shift+Z (?¤ì‹œ?¤í–‰)
      if (isInput) {
        // ?…ë ¥ ?„ë“œ?ì„œ ?ˆìš©???¨ì¶•??
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

        // Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z????ƒ ?ˆìš©
        if (e.ctrlKey && !e.shiftKey && (key === "z" || key === "y")) {
          return; // ?´ë²¤???•ìƒ ì§„í–‰
        }
        if (e.ctrlKey && e.shiftKey && key === "z") {
          return; // ?´ë²¤???•ìƒ ì§„í–‰
        }

        // Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A??Shift ?†ì„ ?Œë§Œ ?ˆìš©
        if (e.ctrlKey && !e.shiftKey && allowedKeys.includes(e.key)) {
          return; // ?´ë²¤???•ìƒ ì§„í–‰ (ë³µì‚¬/ë¶™ì—¬?£ê¸°/?˜ë¼?´ê¸°/?„ì²´? íƒ)
        }
      }

      // ?€???¸ì‡„/ìº¡ì²˜ ê´€???¤ëŠ” ëª¨ë“  ê³³ì—??ì°¨ë‹¨

      // Ctrl+S (?˜ì´ì§€ ?€?? - ëª¨ë“  ê³³ì—??ì°¨ë‹¨
      if (e.ctrlKey && !e.shiftKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl+P (?¸ì‡„) - ëª¨ë“  ê³³ì—??ì°¨ë‹¨
      if (e.ctrlKey && !e.shiftKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl+Shift+S (?˜ì´ì§€ ?€???¤í¬ë¡?ìº¡ì²˜) - ëª¨ë“  ê³³ì—??ì°¨ë‹¨
      if (e.ctrlKey && e.shiftKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl+Shift+C (ì§ì ‘ ì§€??ìº¡ì²˜) - ?…ë ¥ ?„ë“œ ?œì™¸?˜ê³  ì°¨ë‹¨
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
      // Ctrl+Shift+W (ì°?ìº¡ì²˜) - ëª¨ë“  ê³³ì—??ì°¨ë‹¨
      if (e.ctrlKey && e.shiftKey && (e.key === "w" || e.key === "W")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl+Shift+D (?¨ìœ„?ì—­ ìº¡ì²˜) - ëª¨ë“  ê³³ì—??ì°¨ë‹¨
      if (e.ctrlKey && e.shiftKey && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl+Shift+A (?„ì²´ìº¡ì²˜) - ?…ë ¥ ?„ë“œ ?œì™¸?˜ê³  ì°¨ë‹¨
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
      // Ctrl+Shift+F (ì§€?•ì‚¬?´ì¦ˆ ìº¡ì²˜) - ëª¨ë“  ê³³ì—??ì°¨ë‹¨
      if (e.ctrlKey && e.shiftKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // PrintScreen ??- ëª¨ë“  ê³³ì—??ì°¨ë‹¨
      if (e.key === "PrintScreen") {
        e.preventDefault();
        e.stopPropagation();
        // ?´ë¦½ë³´ë“œ ì§€?°ê¸° ?œë„
        if (navigator.clipboard) {
          navigator.clipboard.writeText("").catch(() => {});
        }
        return false;
      }
      // Win+Shift+S (Windows ?¤í¬ë¦°ìƒ· ?„êµ¬) - ëª¨ë“  ê³³ì—??ì°¨ë‹¨
      if (e.shiftKey && e.metaKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // F12 (ê°œë°œ???„êµ¬) - ëª¨ë“  ê³³ì—??ì°¨ë‹¨
      if (e.key === "F12") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl+Shift+I (ê°œë°œ???„êµ¬) - ëª¨ë“  ê³³ì—??ì°¨ë‹¨
      if (e.ctrlKey && e.shiftKey && (e.key === "i" || e.key === "I")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };
    document.addEventListener("keydown", blockKeys, { capture: true });
    document.addEventListener("keyup", blockKeys, { capture: true });

    // ?´ë¦°??
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
      // ì¶”ê????¤í????œê±°
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, []);

  const openImageInNewWindow = useCallback(
    (imageData: string, title: string = "?´ë?ì§€ ë³´ê¸°") => {
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
        setError("ì°¸ì¡° ?´ë?ì§€??ìµœë? 10MBê¹Œì? ?…ë¡œ?œí•  ???ˆìŠµ?ˆë‹¤.");
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
        setCameraAngleError("?ë³¸ ?´ë?ì§€??ìµœë? 10MBê¹Œì? ?…ë¡œ?œí•  ???ˆìŠµ?ˆë‹¤.");
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
        "?œë²„ API ?¤ê? ?¤ì •?˜ì? ?Šì•˜?µë‹ˆ?? ê´€ë¦¬ì?ê²Œ ë¬¸ì˜?´ì£¼?¸ìš”."
      );
      return;
    }
    if (!personaInput.trim()) {
      setPersonaError("???˜ë¥´?Œë‚˜ ?¤ëª…?´ë‚˜ ?€ë³¸ì„ ?…ë ¥?´ì£¼?¸ìš”.");
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
    setLoadingProgress("?˜ë¥´?Œë‚˜ ë¶„ì„ ì¤?..");

    // ìµœë? ?ˆìƒ ë¹„ìš© (ë³´í†µ 1-3ê°??ì„±?? ìµœë? 5ê°œë¡œ ê°€??
    const estimatedCost = 5 * IMAGE_CREDIT_COST;
    let creditDeducted = false;

    try {
      // ?¬ë ˆ??? ì°¨ê°?
      await deductCredits(estimatedCost);
      creditDeducted = true;

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
        // ?ì„± ?¤íŒ¨ ???¬ë ˆ???˜ë¶ˆ
        if (creditDeducted) {
          try {
            await fetch("/api/YOUTUBE/user/credits-deduct", {
              method: "POST",
              headers: await getAuthHeaders().then(r => r.headers),
              body: JSON.stringify({ action: "refund", cost: estimatedCost }),
            });
          } catch (refundError) {
            console.error("?¬ë ˆ???˜ë¶ˆ ?¤íŒ¨:", refundError);
          }
        }
        setPersonaError(
          "?˜ë¥´?Œë‚˜ ?ì„±???¤íŒ¨?ˆìŠµ?ˆë‹¤. ?¬ë ˆ?§ì´ ?˜ë¶ˆ?˜ì—ˆ?µë‹ˆ?? ?…ë ¥??ë°”ê¿” ?¤ì‹œ ?œë„?´ì£¼?¸ìš”."
        );
      } else {
        // ?¤ì œ ?¬ìš©??ë§Œí¼ë§?ì°¨ê°?˜ê³  ?˜ë¨¸ì§€ ?˜ë¶ˆ
        const actualCost = generatedCharacters.length * IMAGE_CREDIT_COST;
        const refundAmount = estimatedCost - actualCost;
        
        if (refundAmount > 0) {
          try {
            await fetch("/api/YOUTUBE/user/credits-deduct", {
              method: "POST",
              headers: await getAuthHeaders().then(r => r.headers),
              body: JSON.stringify({ action: "refund", cost: refundAmount }),
            });
          } catch (refundError) {
            console.error("?¬ë ˆ???˜ë¶ˆ ?¤íŒ¨:", refundError);
          }
        }

        setCharacters(generatedCharacters);
        setPersonaError(`???˜ë¥´?Œë‚˜ ${generatedCharacters.length}ê°??ì„± ?„ë£Œ (${actualCost} ???¬ìš©)`);
        setTimeout(() => saveDataToStorage(true), 100);
        window.dispatchEvent(new Event("creditRefresh"));
      }
    } catch (e) {
      console.error("[ê°œë°œ?ìš©] ?˜ë¥´?Œë‚˜ ?ì„± ?¤ë¥˜:", e);
      
      // ?¤ë¥˜ ë°œìƒ ???¬ë ˆ???˜ë¶ˆ
      if (creditDeducted) {
        try {
          await fetch("/api/YOUTUBE/user/credits-deduct", {
            method: "POST",
            headers: await getAuthHeaders().then(r => r.headers),
            body: JSON.stringify({ action: "refund", cost: estimatedCost }),
          });
          window.dispatchEvent(new Event("creditRefresh"));
        } catch (refundError) {
          console.error("?¬ë ˆ???˜ë¶ˆ ?¤íŒ¨:", refundError);
        }
      }

      const message =
        e instanceof Error
          ? e.message
          : "?˜ë¥´?Œë‚˜ ?ì„± ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.";
      const displayMessage = message.startsWith('??) || message.startsWith('??) ? message : `??${message}`;
      setPersonaError(creditDeducted ? `${displayMessage} (?¬ë ˆ?§ì´ ?˜ë¶ˆ?˜ì—ˆ?µë‹ˆ??` : displayMessage);
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
    deductCredits,
    getAuthHeaders,
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
          "?œë²„ API ?¤ê? ?¤ì •?˜ì? ?Šì•˜?µë‹ˆ?? ê´€ë¦¬ì?ê²Œ ë¬¸ì˜?´ì£¼?¸ìš”."
        );
        return;
      }
      let creditDeducted = false;
      try {
        // ?¬ë ˆ??? ì°¨ê°?
        await deductCredits(IMAGE_CREDIT_COST);
        creditDeducted = true;

        const mergedDescription = customPrompt
          ? `${description}\nì¶”ê? ?”ì²­: ${customPrompt}`
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
        setPersonaError(`??${name} ?´ë?ì§€ê°€ ?…ë°?´íŠ¸?˜ì—ˆ?µë‹ˆ?? (${IMAGE_CREDIT_COST} ???¬ìš©)`);
        setTimeout(() => saveDataToStorage(true), 100);
        window.dispatchEvent(new Event("creditRefresh"));
      } catch (e) {
        console.error("[ê°œë°œ?ìš©] ?˜ë¥´?Œë‚˜ ?¬ìƒ???¤ë¥˜:", e);
        
        // ?¤ë¥˜ ë°œìƒ ???¬ë ˆ???˜ë¶ˆ
        if (creditDeducted) {
          try {
            await fetch("/api/YOUTUBE/user/credits-deduct", {
              method: "POST",
              headers: await getAuthHeaders().then(r => r.headers),
              body: JSON.stringify({ action: "refund", cost: IMAGE_CREDIT_COST }),
            });
            window.dispatchEvent(new Event("creditRefresh"));
          } catch (refundError) {
            console.error("?¬ë ˆ???˜ë¶ˆ ?¤íŒ¨:", refundError);
          }
        }

        const message =
          e instanceof Error ? e.message : "?˜ë¥´?Œë‚˜ ?¬ìƒ?±ì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤.";
        const displayMessage = message.startsWith('??) || message.startsWith('??) ? message : `??${message}`;
        setPersonaError(creditDeducted ? `${displayMessage} (?¬ë ˆ?§ì´ ?˜ë¶ˆ?˜ì—ˆ?µë‹ˆ??` : displayMessage);
      }
    },
    [apiKey, imageStyle, aspectRatio, personaStyle, saveDataToStorage, deductCredits, getAuthHeaders]
  );

  const handleGenerateVideoSource = useCallback(async () => {
    if (!apiKey.trim()) {
      setError("?œë²„ API ?¤ê? ?¤ì •?˜ì? ?Šì•˜?µë‹ˆ?? ê´€ë¦¬ì?ê²Œ ë¬¸ì˜?´ì£¼?¸ìš”.");
      return;
    }
    if (!videoSourceScript.trim()) {
      setError("?ìƒ ?ŒìŠ¤ ?€ë³¸ì„ ?…ë ¥?´ì£¼?¸ìš”.");
      return;
    }
    if (characters.length === 0 && !referenceImage) {
      setError("?˜ë¥´?Œë‚˜ë¥??ì„±?˜ê±°??ì°¸ì¡° ?´ë?ì§€ë¥??…ë¡œ?œí•´ì£¼ì„¸??");
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
    setLoadingProgress("?€ë³?ë¶„ì„ ì¤?..");

    const estimatedCost = imageCount * IMAGE_CREDIT_COST;
    let creditDeducted = false;

    try {
      // ?¬ë ˆ??? ì°¨ê°?
      await deductCredits(estimatedCost);
      creditDeducted = true;

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

      if (!generatedVideoSource || generatedVideoSource.length === 0) {
        // ?ì„± ?¤íŒ¨ ???¬ë ˆ???˜ë¶ˆ
        if (creditDeducted) {
          try {
            await fetch("/api/YOUTUBE/user/credits-deduct", {
              method: "POST",
              headers: await getAuthHeaders().then(r => r.headers),
              body: JSON.stringify({ action: "refund", cost: estimatedCost }),
            });
            window.dispatchEvent(new Event("creditRefresh"));
          } catch (refundError) {
            console.error("?¬ë ˆ???˜ë¶ˆ ?¤íŒ¨:", refundError);
          }
        }
        setError("?ìƒ ?ŒìŠ¤ ?ì„±???¤íŒ¨?ˆìŠµ?ˆë‹¤. ?¬ë ˆ?§ì´ ?˜ë¶ˆ?˜ì—ˆ?µë‹ˆ??");
      } else {
        // ?¤ì œ ?ì„±???´ë?ì§€ ?˜ì— ?°ë¥¸ ?¬ë ˆ??ì¡°ì •
        const actualCost = generatedVideoSource.length * IMAGE_CREDIT_COST;
        const refundAmount = estimatedCost - actualCost;
        
        if (refundAmount > 0) {
          try {
            await fetch("/api/YOUTUBE/user/credits-deduct", {
              method: "POST",
              headers: await getAuthHeaders().then(r => r.headers),
              body: JSON.stringify({ action: "refund", cost: refundAmount }),
            });
          } catch (refundError) {
            console.error("?¬ë ˆ???˜ë¶ˆ ?¤íŒ¨:", refundError);
          }
        }

        setVideoSource(generatedVideoSource);
        setTimeout(() => saveDataToStorage(true), 100);
        window.dispatchEvent(new Event("creditRefresh"));
      }
    } catch (e) {
      console.error("[ê°œë°œ?ìš©] ?ìƒ ?ŒìŠ¤ ?ì„± ?¤ë¥˜:", e);
      
      // ?¤ë¥˜ ë°œìƒ ???¬ë ˆ???˜ë¶ˆ
      if (creditDeducted) {
        try {
          await fetch("/api/YOUTUBE/user/credits-deduct", {
            method: "POST",
            headers: await getAuthHeaders().then(r => r.headers),
            body: JSON.stringify({ action: "refund", cost: estimatedCost }),
          });
          window.dispatchEvent(new Event("creditRefresh"));
        } catch (refundError) {
          console.error("?¬ë ˆ???˜ë¶ˆ ?¤íŒ¨:", refundError);
        }
      }

      const message =
        e instanceof Error
          ? e.message
          : "?ìƒ ?ŒìŠ¤ ?ì„± ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.";
      const displayMessage = message.startsWith('??) || message.startsWith('??) ? message : `??${message}`;
      setError(creditDeducted ? `${displayMessage} (?¬ë ˆ?§ì´ ?˜ë¶ˆ?˜ì—ˆ?µë‹ˆ??` : displayMessage);
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
    deductCredits,
    getAuthHeaders,
  ]);

  const handleRegenerateVideoSourceImage = useCallback(
    async (storyboardItemId: string, customPrompt?: string) => {
      if (!apiKey.trim()) {
        setError("?œë²„ API ?¤ê? ?¤ì •?˜ì? ?Šì•˜?µë‹ˆ?? ê´€ë¦¬ì?ê²Œ ë¬¸ì˜?´ì£¼?¸ìš”.");
        return;
      }

      const target = videoSource.find((item) => item.id === storyboardItemId);
      if (!target) return;

      let creditDeducted = false;
      try {
        // ?¬ë ˆ??? ì°¨ê°?
        await deductCredits(IMAGE_CREDIT_COST);
        creditDeducted = true;

        const mergedScene = customPrompt
          ? `${target.sceneDescription}\nì¶”ê? ?”ì²­: ${customPrompt}`
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
        window.dispatchEvent(new Event("creditRefresh"));
      } catch (e) {
        console.error("[ê°œë°œ?ìš©] ?ìƒ ?ŒìŠ¤ ?¬ìƒ???¤ë¥˜:", e);
        
        // ?¤ë¥˜ ë°œìƒ ???¬ë ˆ???˜ë¶ˆ
        if (creditDeducted) {
          try {
            await fetch("/api/YOUTUBE/user/credits-deduct", {
              method: "POST",
              headers: await getAuthHeaders().then(r => r.headers),
              body: JSON.stringify({ action: "refund", cost: IMAGE_CREDIT_COST }),
            });
            window.dispatchEvent(new Event("creditRefresh"));
          } catch (refundError) {
            console.error("?¬ë ˆ???˜ë¶ˆ ?¤íŒ¨:", refundError);
          }
        }

        const message =
          e instanceof Error ? e.message : "?ìƒ ?ŒìŠ¤ ?¬ìƒ?±ì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤.";
        const displayMessage = message.startsWith('??) || message.startsWith('??) ? message : `??${message}`;
        setError(creditDeducted ? `${displayMessage} (?¬ë ˆ?§ì´ ?˜ë¶ˆ?˜ì—ˆ?µë‹ˆ??` : displayMessage);
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
      deductCredits,
      getAuthHeaders,
    ]
  );

  const handleGenerateCameraAngles = useCallback(async () => {
    if (!apiKey.trim()) {
      setCameraAngleError(
        "?œë²„ API ?¤ê? ?¤ì •?˜ì? ?Šì•˜?µë‹ˆ?? ê´€ë¦¬ì?ê²Œ ë¬¸ì˜?´ì£¼?¸ìš”."
      );
      return;
    }
    if (!cameraAngleSourceImage) {
      setCameraAngleError("?ë³¸ ?´ë?ì§€ë¥??…ë¡œ?œí•´ì£¼ì„¸??");
      return;
    }
    if (selectedCameraAngles.length === 0) {
      setCameraAngleError("?ì„±???µê???ìµœì†Œ 1ê°??´ìƒ ? íƒ?´ì£¼?¸ìš”.");
      return;
    }

    setIsLoadingCameraAngles(true);
    setCameraAngleError(null);
    setCameraAngles([]);
    setCameraAngleProgress("?ë³¸ ?´ë?ì§€ ë¶„ì„ ì¤?..");

    const estimatedCost = selectedCameraAngles.length * IMAGE_CREDIT_COST;
    let creditDeducted = false;

    try {
      // ?¬ë ˆ??? ì°¨ê°?
      await deductCredits(estimatedCost);
      creditDeducted = true;

      const generatedAngles = await generateCameraAngles(
        cameraAngleSourceImage,
        selectedCameraAngles,
        apiKey,
        aspectRatio,
        (message, current, total) => {
          setCameraAngleProgress(`${message} (${current}/${total})`);
        }
      );

      const successCount = generatedAngles.filter(
        (angle) => angle.image && angle.image.trim() !== ""
      ).length;
      const totalSelected = selectedCameraAngles.length;

      // ?¤ì œ ?±ê³µ??ê°œìˆ˜ë§Œí¼ë§?ì°¨ê°?˜ê³  ?˜ë¨¸ì§€ ?˜ë¶ˆ
      const actualCost = successCount * IMAGE_CREDIT_COST;
      const refundAmount = estimatedCost - actualCost;
      
      if (refundAmount > 0) {
        try {
          await fetch("/api/YOUTUBE/user/credits-deduct", {
            method: "POST",
            headers: await getAuthHeaders().then(r => r.headers),
            body: JSON.stringify({ action: "refund", cost: refundAmount }),
          });
        } catch (refundError) {
          console.error("?¬ë ˆ???˜ë¶ˆ ?¤íŒ¨:", refundError);
        }
      }

      setCameraAngles(generatedAngles);
      setTimeout(() => saveDataToStorage(true), 100);
      window.dispatchEvent(new Event("creditRefresh"));

      if (successCount === 0) {
        setCameraAngleError(
          "ëª¨ë“  ?µê? ?ì„±???¤íŒ¨?ˆìŠµ?ˆë‹¤. ?¬ë ˆ?§ì´ ?˜ë¶ˆ?˜ì—ˆ?µë‹ˆ?? ? ì‹œ ???¤ì‹œ ?œë„?´ì£¼?¸ìš”."
        );
      } else if (successCount < totalSelected) {
        setCameraAngleError(
          `? ï¸ ${successCount}/${totalSelected}ê°??µê?ë§??ì„±?˜ì—ˆ?µë‹ˆ?? (${actualCost} ???¬ìš©, ${refundAmount} ???˜ë¶ˆ??`
        );
      } else {
        setCameraAngleError(`??${successCount}ê°??µê? ?ì„± ?„ë£Œ (${actualCost} ???¬ìš©)`);
      }
    } catch (e) {
      console.error("[ê°œë°œ?ìš©] ì¹´ë©”???µê? ?ì„± ?¤ë¥˜:", e);
      
      // ?¤ë¥˜ ë°œìƒ ???¬ë ˆ???˜ë¶ˆ
      if (creditDeducted) {
        try {
          await fetch("/api/YOUTUBE/user/credits-deduct", {
            method: "POST",
            headers: await getAuthHeaders().then(r => r.headers),
            body: JSON.stringify({ action: "refund", cost: estimatedCost }),
          });
          window.dispatchEvent(new Event("creditRefresh"));
        } catch (refundError) {
          console.error("?¬ë ˆ???˜ë¶ˆ ?¤íŒ¨:", refundError);
        }
      }

      const message =
        e instanceof Error
          ? e.message
          : "ì¹´ë©”???µê? ?ì„± ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.";
      setCameraAngleError(creditDeducted ? `${message} (?¬ë ˆ?§ì´ ?˜ë¶ˆ?˜ì—ˆ?µë‹ˆ??` : message);
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
    deductCredits,
    getAuthHeaders,
  ]);

  const handleResetAll = useCallback(() => {
    try {
      localStorage.removeItem("youtube_image_work_data");
    } catch (storageError) {
      console.error("? localStorage ?•ë¦¬ ?¤íŒ¨:", storageError);
    }
    try {
      sessionStorage.removeItem("youtube_image_work_data");
    } catch (storageError) {
      console.error("? sessionStorage ?•ë¦¬ ?¤íŒ¨:", storageError);
    }

    setCharacters([]);
    setVideoSource([]);
    setPersonaInput("");
    setVideoSourceScript("");
    setPersonaReferenceImage(null);
    setReferenceImage(null);
    setImageStyle("realistic");
    setPersonaStyle("?¤ì‚¬ ê·¹ë???);
    setCharacterStyle("?¤ì‚¬ ê·¹ë???);
    setBackgroundStyle("ëª¨ë˜");
    setCustomCharacterStyle("");
    setCustomBackgroundStyle("");
    setCustomStyle("");
    setPhotoComposition("?•ë©´");
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
      // ê°??´ë?ì§€ë¥??œì°¨?ìœ¼ë¡??¤ìš´ë¡œë“œ
      for (let index = 0; index < videoSource.length; index++) {
        const item = videoSource[index];
        const safeDescription = item.sceneDescription
          .replace(/[^a-zA-Z0-9???ã…-?£ê?-??/g, "_")
          .substring(0, 30);
        const fileName = `?¥ë©´_${index + 1}_${safeDescription}.jpg`;
        
        try {
          // Base64ë¥?Blob?¼ë¡œ ë³€??
          const base64Response = await fetch(`data:image/jpeg;base64,${item.image}`);
          const blob = await base64Response.blob();
          
          // File System Access API ì§€???•ì¸
          if ('showSaveFilePicker' in window) {
            try {
              const handle = await (window as any).showSaveFilePicker({
                suggestedName: fileName,
                types: [
                  {
                    description: '?´ë?ì§€ ?Œì¼',
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
                // ?¬ìš©?ê? ???Œì¼ ?€?¥ì„ ì·¨ì†Œ??
                cancelCount++;
                console.log(`[${index + 1}/${videoSource.length}] ?¬ìš©?ê? ?€?¥ì„ ì·¨ì†Œ?ˆìŠµ?ˆë‹¤.`);
              } else {
                throw err;
              }
            }
          } else {
            // ?´ë°±: ê¸°ì¡´ ?¤ìš´ë¡œë“œ ë°©ì‹
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            successCount++;
            
            // ?ë™ ?¤ìš´ë¡œë“œ ???½ê°„???œë ˆ??
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (err) {
          console.error(`[ê°œë°œ?ìš©] ?´ë?ì§€ ${index + 1} ?¤ìš´ë¡œë“œ ?¤ë¥˜:`, err);
          throw err;
        }
      }
      
      // ?¤ìš´ë¡œë“œ ?„ë£Œ ë©”ì‹œì§€
      if (successCount > 0) {
        setError(`? ${successCount}ê°œì˜ ?´ë?ì§€ê°€ ?€?¥ë˜?ˆìŠµ?ˆë‹¤!` + 
                (cancelCount > 0 ? ` (${cancelCount}ê°?ì·¨ì†Œ??` : ''));
      } else if (cancelCount > 0) {
        setError(`ëª¨ë“  ?¤ìš´ë¡œë“œê°€ ì·¨ì†Œ?˜ì—ˆ?µë‹ˆ??`);
      }
    } catch (e) {
      console.error("[ê°œë°œ?ìš©] ?´ë?ì§€ ?¤ìš´ë¡œë“œ ?¤ë¥˜:", e);
      
      // ?¬ìš©?ìš© ?¤ë¥˜ ë©”ì‹œì§€
      let userMessage = "?Œì¼ ?¤ìš´ë¡œë“œ???¤íŒ¨?ˆìŠµ?ˆë‹¤. ?¤ì‹œ ?œë„??ì£¼ì„¸??";
      
      if (e instanceof Error) {
        console.error(`[ê°œë°œ?ìš©] ?¤ë¥˜ ?ì„¸: ${e.name} - ${e.message}`);
        
        if (e.name === 'NotAllowedError') {
          userMessage = "?Œì¼ ?€??ê¶Œí•œ??ê±°ë??˜ì—ˆ?µë‹ˆ?? ë¸Œë¼?°ì? ?¤ì •???•ì¸??ì£¼ì„¸??";
        } else if (e.name === 'SecurityError') {
          userMessage = "ë³´ì•ˆ ë¬¸ì œë¡??Œì¼???€?¥í•  ???†ìŠµ?ˆë‹¤. ë¸Œë¼?°ì?ë¥??…ë°?´íŠ¸?˜ê±°???¤ë¥¸ ë¸Œë¼?°ì?ë¥??¬ìš©??ì£¼ì„¸??";
        }
      }
      
      setError(userMessage);
    } finally {
      setIsDownloading(false);
    }
  }, [videoSource]);

  // ?¼ìš°??ì²˜ë¦¬
  if (currentView === "user-guide") {
    return (
      <>
        <MetaTags
          title="? íŠœë¸??´ë?ì§€ ?ì„±ê¸??¬ìš©ë²?ê°€?´ë“œ - AIë¡?ì½˜í…ì¸??œì‘?˜ê¸°"
          description="AIë¥??œìš©?˜ì—¬ ? íŠœë¸??˜ë¥´?Œë‚˜?€ ?ìƒ ?ŒìŠ¤ë¥??ì„±?˜ëŠ” ë°©ë²•???ì„¸???Œë ¤?œë¦½?ˆë‹¤. ?¨ê³„ë³?ê°€?´ë“œë¡??½ê²Œ ?°ë¼?˜ì„¸??"
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
        title="? íŠœë¸?ë¡±í¼ ?´ë?ì§€ ?ì„±ê¸?- AIë¡?ìºë¦­?°ì? ?¤í† ë¦¬ë³´??ë§Œë“¤ê¸?
        description="Google Gemini AIë¥??œìš©??? íŠœë¸?ì½˜í…ì¸ ìš© ?˜ë¥´?Œë‚˜?€ ?ìƒ ?ŒìŠ¤ë¥??½ê³  ë¹ ë¥´ê²??ì„±?˜ì„¸?? ?¤ì–‘??ë¹„ìœ¨(9:16, 16:9, 1:1) ì§€??"
        url={normalizedBasePath || "/image"}
        image="/og-image.png"
        type="website"
      />
      {!noAds && <SideFloatingAd side="left" />}
      {!noAds && <SideFloatingAd side="right" />}
      <div
        className="min-h-screen bg-gray-900 text-white font-sans p-4 sm:p-6 lg:p-8"
        style={{ paddingBottom: "120px" }}
      >
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">
              ? íŠœë¸?ë¡±í¼ ?´ë?ì§€ ?ì„±ê¸?
            </h1>
            <p className="mt-2 text-lg text-gray-400">
              ?¤í¬ë¦½íŠ¸ë¥??…ë ¥?˜ê³  ?¼ê???ìºë¦­?°ì? ?ìƒ ?ŒìŠ¤ ?´ë?ì§€ë¥??ì„±?˜ì„¸??
            </p>

            {/* ?°ì´??ë³µì› ?ˆë‚´ (ë³µì›???°ì´?°ê? ?ˆì„ ?Œë§Œ ?œì‹œ) */}
            {(characters.length > 0 || videoSource.length > 0 || cameraAngles.length > 0) && (
              <div className="mt-4 bg-green-900/20 border border-green-500/50 rounded-lg p-3 max-w-2xl mx-auto">
                <p className="text-green-300 text-sm flex items-center justify-center">
                  <span className="mr-2">??/span>
                  ?´ì „ ?‘ì—…??ë³µì›?˜ì—ˆ?µë‹ˆ??
                  {characters.length > 0 && ` ?˜ë¥´?Œë‚˜ ${characters.length}ê°?}
                  {videoSource.length > 0 && ` | ?ìƒ?ŒìŠ¤ ${videoSource.length}ê°?}
                  {cameraAngles.length > 0 && ` | ì¹´ë©”?¼ì•µê¸€ ${cameraAngles.length}ê°?}
                </p>
              </div>
            )}

            {/* ?¤ë¹„ê²Œì´??ë§í¬ */}
            <div className="flex justify-center mt-4 space-x-4">
              <button
                onClick={() => navigateToView("user-guide")}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors"
              >
                ?¬ìš©ë²?
              </button>
            </div>
          </header>

          <main className="space-y-6">
            {!noAds && <AdBanner />}

            <section className="bg-gray-800 p-6 rounded-xl shadow-2xl border-2 border-blue-500">
              <h2 className="text-2xl font-bold mb-4 text-blue-400 flex items-center">
                <span className="mr-2">1ï¸âƒ£</span>
                ?˜ë¥´?Œë‚˜ ?ì„±
              </h2>
              <div className="mb-4">
                <p className="text-gray-400 text-sm mb-3">
                  êµ¬ì²´?ì¸ ?¸ë¬¼ ë¬˜ì‚¬ë¥??…ë ¥?˜ê±°?? ?€ë³¸ì„ ?£ìœ¼ë©??±ì¥?¸ë¬¼?¤ì„
                  ?ë™?¼ë¡œ ë¶„ì„?˜ì—¬ ?ì„±?©ë‹ˆ??
                </p>
                <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4 mb-4">
                  <p className="text-blue-200 text-sm mb-2">
                    <strong>?…ë ¥ ?ˆì‹œ:</strong>
                  </p>
                  <ul className="text-blue-300 text-sm space-y-1 ml-4">
                    <li>
                      ? <strong>?¸ë¬¼ ë¬˜ì‚¬:</strong> "20?€ ì¤‘ë°˜ ?¬ì„±, ê¸??‘ë°œ,
                      ë°ì? ë¯¸ì†Œ, ìºì£¼?¼í•œ ?·ì°¨ë¦?
                    </li>
                    <li>
                      ? <strong>?€ë³??…ë ¥:</strong> ?„ì²´ ?¤í† ë¦??€ë³¸ì„ ?£ìœ¼ë©?
                      ?±ì¥?¸ë¬¼ ?ë™ ì¶”ì¶œ
                    </li>
                  </ul>
                </div>
              </div>
              <textarea
                value={personaInput}
                onChange={(e) => setPersonaInput(e.target.value)}
                placeholder="?¸ë¬¼ ë¬˜ì‚¬???€ë³¸ì„ ?…ë ¥?˜ì„¸??.."
                className="w-full h-48 p-4 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 resize-y mb-6"
              />

              {/* ?´ë?ì§€ ?¤í???? íƒ */}
              <div className="mb-6 bg-blue-900/20 border border-blue-500/50 rounded-lg p-6">
                <h3 className="text-blue-300 font-medium mb-6 flex items-center">
                  <span className="mr-2">?¨</span>
                  ?´ë?ì§€ ?¤í???? íƒ
                </h3>

                {/* ?¸ë¬¼ ?¤í???*/}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-blue-200 font-medium flex items-center text-sm">
                      <span className="mr-2">?‘¤</span>
                      ?¸ë¬¼ ?¤í???
                    </h4>
                    <button
                      onClick={() => setCharacterStyle("custom")}
                      className={`py-1.5 px-4 rounded-lg font-medium text-xs transition-all duration-200 ${
                        characterStyle === "custom"
                          ? "bg-blue-600 text-white shadow-lg scale-105"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      ì§ì ‘ ?…ë ¥
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {(
                      [
                        "?¤ì‚¬ ê·¹ë???,
                        "? ë‹ˆë©”ì´??,
                        "?™ë¬¼",
                        "?¹íˆ°",
                      ] as CharacterStyle[]
                    ).map((style) => {
                      const styleDescriptions: Record<CharacterStyle, string> =
                        {
                          "?¤ì‚¬ ê·¹ë???:
                            "[TEST] ì´ˆí˜„?¤ì ?´ê³  ?¬ì§„ ê°™ì? ?„ë¦¬?°ì˜ ?¤ì‚¬ ?¸ë¬¼",
                          ? ë‹ˆë©”ì´?? "?¨ ë°ê³  ?”ë ¤??? ë‹ˆë©”ì´???¤í???ìºë¦­??,
                          ?™ë¬¼: "?¾ ê·€?¬ìš´ ?™ë¬¼ ìºë¦­?°ë¡œ ë³€??,
                          ?¹íˆ°: "?–Šï¸?ê¹¨ë—??? ê³¼ ?œí˜„???ë????œêµ­ ?¹íˆ° ?¤í???,
                          custom: "",
                        };

                      return (
                        <div key={style} className="relative">
                          <button
                            onClick={() => setCharacterStyle(style)}
                            className={`relative w-full h-32 rounded-lg font-medium text-sm transition-all duration-200 overflow-hidden group ${
                              characterStyle === style
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
                      placeholder="?í•˜???¸ë¬¼ ?¤í??¼ì„ ?…ë ¥?˜ì„¸??(?? ë¥´ë„¤?ìŠ¤, ë¹…í† ë¦¬ì•„ ?œë? ??"
                      className="w-full p-3 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors mt-3"
                    />
                  )}
                </div>

                {/* ë°°ê²½/ë¶„ìœ„ê¸??¤í???*/}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-blue-200 font-medium flex items-center text-sm">
                      <span className="mr-2">?Œ†</span>
                      ë°°ê²½/ë¶„ìœ„ê¸??¤í???
                    </h4>
                    <button
                      onClick={() => setBackgroundStyle("custom")}
                      className={`py-1.5 px-4 rounded-lg font-medium text-xs transition-all duration-200 ${
                        backgroundStyle === "custom"
                          ? "bg-blue-600 text-white shadow-lg scale-105"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      ì§ì ‘ ?…ë ¥
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
                    {(
                      [
                        "ê°ì„± ë©œë¡œ",
                        "?œë?ê·?,
                        "ê³µí¬ ?¤ë¦´??,
                        "?¬ì´ë²„í‘??,
                        "?í?ì§€",
                        "ë¯¸ë‹ˆë©€",
                        "ë¹ˆí‹°ì§€",
                        "ëª¨ë˜",
                        "1980?„ë?",
                        "2000?„ë?",
                        "ë¨¹ë°©",
                        "ê·€?¬ì?",
                        "AI",
                        "ê´´ì´??,
                        "ì°½ì˜?ì¸",
                        "ì¡°ì„ ?œë?",
                      ] as BackgroundStyle[]
                    ).map((style) => {
                      const styleDescriptions: Record<BackgroundStyle, string> =
                        {
                          "ê°ì„± ë©œë¡œ": "?’ ë¡œë§¨?±í•˜ê³?ê°ì„±?ì¸ ?°ëœ»??ë¶„ìœ„ê¸?,
                          ?œë?ê·? "?¤  ê±°ì¹œ ?¬ë§‰ê³?ì¹´ìš°ë³´ì´ ë°°ê²½",
                          "ê³µí¬ ?¤ë¦´??: "?‘» ë¯¸ìŠ¤?°ë¦¬?˜ê³  ê¸´ì¥ê°??ˆëŠ” ë¶„ìœ„ê¸?,
                          ?¬ì´ë²„í‘?? "?Œƒ ?¤ì˜¨?¬ì¸ ê°€?í•œ ë¯¸ë˜ ?„ì‹œ",
                          ?í?ì§€: "?§™?â™‚ï¸?ë§ˆë²•?ì´ê³?? ë¹„ë¡œìš´ ì¤‘ì„¸ ë°°ê²½",
                          ë¯¸ë‹ˆë©€: "? ê¹”ë”?˜ê³  ?¨ìˆœ??ì¤‘ì„±??ë°°ê²½",
                          ë¹ˆí‹°ì§€: "?•°ï¸??´ë˜?í•˜ê³??¥ìˆ˜ë¥??ì•„?´ëŠ” ë°°ê²½",
                          ëª¨ë˜: "?™ï¸??„ë??ì´ê³??¸ë ¨???„ì‹œ ë°°ê²½",
                          "1980?„ë?": "?“» 80?„ë? ?ˆíŠ¸ë¡??¨ì…˜ê³?ë¶„ìœ„ê¸?,
                          "2000?„ë?": "?’¿ 2000?„ë? ì´ˆë°˜ ê°ì„±ê³??¤í???,
                          ë¨¹ë°©: "?œ ë§›ìˆ???Œì‹??ê°€?í•œ ë¨¹ë°© ë¶„ìœ„ê¸?,
                          ê·€?¬ì?: "?° ê·€?½ê³  ?¬ë‘?¤ëŸ¬???ŒìŠ¤??ê°ì„±",
                          AI: "?¤– ë¯¸ë˜ì§€?¥ì ???˜ì´?Œí¬ AI ë¶„ìœ„ê¸?,
                          ê´´ì´?? "?? ?…íŠ¹?˜ê³  ì´ˆí˜„?¤ì ??ê¸°ë¬˜??ë¶„ìœ„ê¸?,
                          ì°½ì˜?ì¸: "???ìƒ???˜ì¹˜???…ì°½?ì¸ ?ˆìˆ  ë¶„ìœ„ê¸?,
                          ì¡°ì„ ?œë?: "?¯ ?œì˜¥ê³??„í†µ ê°€?? ?°ëœ»?˜ê³  ê°ì„±?ì¸ ì¡°ì„  ë¶„ìœ„ê¸?,
                          custom: "",
                        };

                      return (
                        <div key={style} className="relative">
                          <button
                            onClick={() => setBackgroundStyle(style)}
                            className={`relative w-full h-32 rounded-lg font-medium text-sm transition-all duration-200 overflow-hidden group ${
                              backgroundStyle === style
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
                      placeholder="?í•˜??ë°°ê²½/ë¶„ìœ„ê¸°ë? ?…ë ¥?˜ì„¸??(?? ?°ì£¼ ?•ê±°?? ?´ë? ?´ë? ??"
                      className="w-full p-3 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors mt-3"
                    />
                  )}
                </div>
              </div>

              {/* ?¬ì§„ ?¤ì • (êµ¬ë„ ë°?ë¹„ìœ¨) */}
              <div className="mb-6 bg-blue-900/20 border border-blue-500/50 rounded-lg p-6">
                <h3 className="text-blue-300 font-medium mb-4 flex items-center">
                  <span className="mr-2">?“·</span>
                  ?¬ì§„ ?¤ì •
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* ?¼ìª½: ?¬ì§„ êµ¬ë„ ? íƒ */}
                  <div>
                    <label className="block text-blue-200 text-sm font-medium mb-2">
                      ?¬ì§„ êµ¬ë„
                    </label>
                    <select
                      value={photoComposition}
                      onChange={(e) =>
                        setPhotoComposition(e.target.value as PhotoComposition)
                      }
                      className="w-full p-3 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-white"
                    >
                      <option value="?•ë©´">?•ë©´ (ê¸°ë³¸)</option>
                      <option value="ì¸¡ë©´">ì¸¡ë©´</option>
                      <option value="ë°˜ì¸¡ë©?>ë°˜ì¸¡ë©?/option>
                      <option value="?„ì—??>?„ì—??/option>
                      <option value="?„ë˜?ì„œ">?„ë˜?ì„œ</option>
                      <option value="?„ì‹ ">?„ì‹ </option>
                      <option value="?ë°˜??>?ë°˜??/option>
                      <option value="?´ë¡œì¦ˆì—…">?´ë¡œì¦ˆì—…</option>
                    </select>
                  </div>

                  {/* ?¤ë¥¸ìª? ?´ë?ì§€ ë¹„ìœ¨ ? íƒ */}
                  <div>
                    <label className="block text-blue-200 text-sm font-medium mb-2">
                      ?´ë?ì§€ ë¹„ìœ¨
                    </label>
                    <select
                      value={aspectRatio}
                      onChange={(e) =>
                        setAspectRatio(e.target.value as AspectRatio)
                      }
                      className="w-full p-3 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-white"
                    >
                      <option value="9:16">?“± 9:16 - ëª¨ë°”???¸ë¡œ</option>
                      <option value="16:9">?–¥ï¸?16:9 - ?°ìŠ¤?¬í†± ê°€ë¡?/option>
                      <option value="1:1">â¬?1:1 - ?•ì‚¬ê°í˜•</option>
                    </select>
                  </div>
                </div>

                <div className="text-xs text-gray-400 mt-3">
                  ?’¡ ?¬ì§„ êµ¬ë„?€ ?´ë?ì§€ ë¹„ìœ¨??ì¡°í•©?˜ì—¬ ?í•˜???¤í??¼ì˜ ?´ë?ì§€ë¥?
                  ë§Œë“œ?¸ìš”.
                </div>
              </div>

              {/* ?¤í???ì°¸ì¡° ?´ë?ì§€ ?…ë¡œ??(? íƒ?¬í•­) */}
              <div className="mb-6 bg-blue-900/20 border border-blue-500/50 rounded-lg p-6">
                <h3 className="text-blue-300 font-medium mb-4 flex items-center">
                  <span className="mr-2">?–¼ï¸?/span>
                  ?¤í???ì°¸ì¡° ?´ë?ì§€ (? íƒ?¬í•­)
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  ?í•˜???¤í??¼ì˜ ?¬ì§„???…ë¡œ?œí•˜ë©??´ë‹¹ ?¤í??¼ì„ ì°¸ê³ ?˜ì—¬
                  ?˜ë¥´?Œë‚˜ë¥??ì„±?©ë‹ˆ??
                </p>

                {!personaReferenceImage ? (
                  <label className="block w-full cursor-pointer">
                    <div className="border-2 border-dashed border-blue-500 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-900/10 transition-all">
                      <div className="text-blue-300 text-4xl mb-3">?–¼ï¸?</div>
                      <p className="text-blue-200 font-medium mb-1">
                        ì°¸ì¡° ?´ë?ì§€ ?…ë¡œ??
                      </p>
                      <p className="text-gray-400 text-sm">
                        ?´ë¦­?˜ì—¬ ?´ë?ì§€ ? íƒ (JPG, PNG)
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
                            console.error("?´ë?ì§€ ë¡œë“œ ?¤íŒ¨:", error);
                            setError("?´ë?ì§€ë¥?ë¶ˆëŸ¬?¤ëŠ”???¤íŒ¨?ˆìŠµ?ˆë‹¤.");
                          }
                        }
                      }}
                    />
                  </label>
                ) : (
                  <div className="relative">
                    <img
                      src={`data:image/jpeg;base64,${personaReferenceImage}`}
                      alt="ì°¸ì¡° ?´ë?ì§€"
                      className="w-full max-h-64 object-contain rounded-lg border-2 border-blue-500"
                    />
                    <button
                      onClick={() => setPersonaReferenceImage(null)}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                    >
                      ? ?? œ
                    </button>
                    <p className="text-green-400 text-sm mt-2 flex items-center">
                      <span className="mr-2">?</span>
                      ì°¸ì¡° ?´ë?ì§€ê°€ ?…ë¡œ?œë˜?ˆìŠµ?ˆë‹¤
                    </p>
                  </div>
                )}
              </div>

              {/* ì»¤ìŠ¤?€ ?„ë¡¬?„íŠ¸ (? íƒ?¬í•­) */}
              <div className="mb-6 bg-blue-900/20 border border-blue-500/50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-blue-300 font-medium flex items-center">
                    <span className="mr-2">?</span>
                    ì»¤ìŠ¤?€ ?´ë?ì§€ ?„ë¡¬?„íŠ¸ (? íƒ?¬í•­)
                  </h3>
                  <button
                    onClick={() => {
                      window.open("https://gemini.google.com/share/56de66e939ff", "_blank", "noopener,noreferrer");
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold rounded-lg text-sm transition-all duration-200 transform hover:scale-105 flex items-center"
                  >
                    <span className="mr-2">?’¡</span>
                    ?´ê? ?í•˜???´ë?ì§€ 200% ë½‘ëŠ” ?¸í•˜??
                  </button>
                </div>

                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="ê³ ê¸‰ ?¬ìš©?ìš©: AI?ê²Œ ?„ë‹¬??êµ¬ì²´?ì¸ ?´ë?ì§€ ?„ë¡¬?„íŠ¸ë¥?ì§ì ‘ ?…ë ¥?˜ì„¸??(?ì–´ ê¶Œì¥)"
                  className="w-full h-24 p-3 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-y"
                />
                <p className="text-gray-400 text-xs mt-2">
                  ?¹ï¸ ???„ë“œ??ê³ ê¸‰ ?¬ìš©?ë? ?„í•œ ê¸°ëŠ¥?…ë‹ˆ?? ë¹„ì›Œ?ë©´ ?ë™?¼ë¡œ
                  ìµœì ?”ëœ ?„ë¡¬?„íŠ¸ê°€ ?ì„±?©ë‹ˆ??
                </p>
              </div>

              {/* ì½˜í…ì¸??•ì±… ?„ë°˜ ê²½ê³  */}
              {contentWarning && !isContentWarningAcknowledged && (
                <div className="mt-4 bg-orange-900/50 border border-orange-500 text-orange-300 p-4 rounded-lg">
                  <div className="flex items-start">
                    <span className="text-orange-400 text-xl mr-3">? ï¸</span>
                    <div className="flex-1">
                      <p className="font-medium mb-2">
                        ì½˜í…ì¸??•ì±… ?„ë°˜ ê°€?¥ì„±???ˆëŠ” ?¨ì–´ê°€ ê°ì??˜ì—ˆ?µë‹ˆ??
                      </p>
                      <div className="mb-3">
                        <p className="text-sm text-orange-200 mb-2">
                          ê°ì????¨ì–´:
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
                          ???ˆì „???¨ì–´ë¡??ë™ êµì²´
                        </button>
                        <button
                          onClick={handleAcknowledgeWarning}
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          ë¬´ì‹œ?˜ê³  ê³„ì†
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
                    <span className="ml-2">?˜ë¥´?Œë‚˜ ?ì„± ì¤?..</span>
                  </>
                ) : (
                  "?˜ë¥´?Œë‚˜ ?ì„± (5 ??"
                )}
              </button>
            </section>

            {/* ?˜ë¥´?Œë‚˜ ?ì„± ê´€???¤ë¥˜/?±ê³µ ë©”ì‹œì§€ ?œì‹œ */}
            {personaError && (
              <div
                className={
                  personaError.startsWith("?")
                    ? "bg-green-900/50 border border-green-500 text-green-300 p-4 rounded-lg"
                    : "bg-red-900/50 border border-red-500 text-red-300 p-4 rounded-lg"
                }
              >
                <div className="flex items-start">
                  <span
                    className={
                      personaError.startsWith("?")
                        ? "text-green-400 text-xl mr-3"
                        : "text-red-400 text-xl mr-3"
                    }
                  >
                    {personaError.startsWith("?") ? "?" : "?"}
                  </span>
                  <div className="flex-1">
                    <pre className="font-medium mb-2 whitespace-pre-wrap text-sm leading-relaxed">{personaError}</pre>
                    <button
                      onClick={() => setPersonaError(null)}
                      className={
                        personaError.startsWith("?")
                          ? "mt-3 text-green-400 hover:text-green-300 text-sm underline"
                          : "mt-3 text-red-400 hover:text-red-300 text-sm underline"
                      }
                    >
                      ?¤ë¥˜ ë©”ì‹œì§€ ?«ê¸°
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isLoadingCharacters && (
              <div className="text-center p-8">
                <Spinner size="lg" />
                <p className="mt-4 text-blue-300 text-lg font-semibold">
                  ?±ì¥?¸ë¬¼??ë¶„ì„?˜ê³  ?´ë?ì§€ë¥??ì„±?˜ê³  ?ˆìŠµ?ˆë‹¤...
                </p>
                {loadingProgress && (
                  <div className="mt-4 bg-blue-900/30 border border-blue-500/50 rounded-lg p-4 max-w-md mx-auto">
                    <p className="text-blue-300 font-bold text-lg animate-pulse">
                      ? {loadingProgress}
                    </p>
                  </div>
                )}
                <p className="mt-4 text-gray-400 text-sm">
                  ? API ê³¼ë???ë°©ì?ë¥??„í•´ ìºë¦­??ê°?3-4ì´??€ê¸??œê°„???ˆìŠµ?ˆë‹¤.
                </p>
                <p className="mt-2 text-gray-500 text-xs">
                  ? ì‹œë§?ê¸°ë‹¤??ì£¼ì„¸?? ê³ í’ˆì§??´ë?ì§€ë¥??ì„±?˜ëŠ” ì¤‘ì…?ˆë‹¤.
                </p>
              </div>
            )}

            {characters.length > 0 && (
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-blue-300">
                    ?ì„±???˜ë¥´?Œë‚˜ ({characters.length}ê°?
                  </h2>
                  <button
                    onClick={async () => {
                      try {
                        let successCount = 0;
                        let cancelCount = 0;
                        
                        for (let index = 0; index < characters.length; index++) {
                          const char = characters[index];
                          const safeCharName = char.name.replace(/[^a-zA-Z0-9???ã…-?£ê?-??/g, '_');
                          const fileName = `${index + 1}_${safeCharName}.jpg`;
                          
                          try {
                            const base64Response = await fetch(`data:image/jpeg;base64,${char.image}`);
                            const blob = await base64Response.blob();
                            
                            if ('showSaveFilePicker' in window) {
                              try {
                                const handle = await (window as any).showSaveFilePicker({
                                  suggestedName: fileName,
                                  types: [
                                    {
                                      description: '?´ë?ì§€ ?Œì¼',
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
                                  cancelCount++;
                                  console.log(`[${index + 1}/${characters.length}] ?¬ìš©?ê? ?€?¥ì„ ì·¨ì†Œ?ˆìŠµ?ˆë‹¤.`);
                                } else {
                                  throw err;
                                }
                              }
                            } else {
                              const link = document.createElement('a');
                              link.href = URL.createObjectURL(blob);
                              link.download = fileName;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              URL.revokeObjectURL(link.href);
                              successCount++;
                              await new Promise(resolve => setTimeout(resolve, 300));
                            }
                          } catch (err) {
                            console.error(`[ê°œë°œ?ìš©] ?˜ë¥´?Œë‚˜ ${index + 1} ?¤ìš´ë¡œë“œ ?¤ë¥˜:`, err);
                            throw err;
                          }
                        }
                        
                        if (successCount > 0) {
                          setPersonaError(`??${successCount}ê°œì˜ ?˜ë¥´?Œë‚˜ê°€ ?€?¥ë˜?ˆìŠµ?ˆë‹¤!` + 
                                  (cancelCount > 0 ? ` (${cancelCount}ê°?ì·¨ì†Œ??` : ''));
                        } else if (cancelCount > 0) {
                          setPersonaError(`ëª¨ë“  ?¤ìš´ë¡œë“œê°€ ì·¨ì†Œ?˜ì—ˆ?µë‹ˆ??`);
                        }
                      } catch (error) {
                        console.error("[ê°œë°œ?ìš©] ?˜ë¥´?Œë‚˜ ?¤ìš´ë¡œë“œ ?¤ë¥˜:", error);
                        
                        let userMessage = "?˜ë¥´?Œë‚˜ ?¤ìš´ë¡œë“œ???¤íŒ¨?ˆìŠµ?ˆë‹¤. ?¤ì‹œ ?œë„??ì£¼ì„¸??";
                        
                        if (error instanceof Error) {
                          console.error(`[ê°œë°œ?ìš©] ?¤ë¥˜ ?ì„¸: ${error.name} - ${error.message}`);
                          
                          if (error.name === 'NotAllowedError') {
                            userMessage = "?Œì¼ ?€??ê¶Œí•œ??ê±°ë??˜ì—ˆ?µë‹ˆ?? ë¸Œë¼?°ì? ?¤ì •???•ì¸??ì£¼ì„¸??";
                          } else if (error.name === 'SecurityError') {
                            userMessage = "ë³´ì•ˆ ë¬¸ì œë¡??Œì¼???€?¥í•  ???†ìŠµ?ˆë‹¤. ë¸Œë¼?°ì?ë¥??…ë°?´íŠ¸?˜ê±°???¤ë¥¸ ë¸Œë¼?°ì?ë¥??¬ìš©??ì£¼ì„¸??";
                          }
                        }
                        
                        setPersonaError(userMessage);
                      }
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
                  >
                    â¬‡ï¸ ëª¨ë‘ ?¤ìš´ë¡œë“œ ({characters.length}ê°?
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {characters.map((char) => (
                    <CharacterCard
                      key={char.id}
                      character={char}
                      onRegenerate={handleRegenerateCharacter}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ê´‘ê³  2: ?˜ë¥´?Œë‚˜ ?ì„±ê³??ìƒ ?ŒìŠ¤ ?ì„± ?¬ì´ */}
            <AdBanner />

            {/* 3?¨ê³„????ƒ ?œì‹œ */}
            <section className="bg-gray-800 p-6 rounded-xl shadow-2xl border-2 border-green-500">
              <h2 className="text-2xl font-bold mb-4 text-green-400 flex items-center">
                <span className="mr-2">2ï¸âƒ£</span>
                ?ìƒ ?ŒìŠ¤ ?ì„±
              </h2>
              <div className="mb-4">
                <p className="text-gray-400 text-sm mb-3">
                  {referenceImage
                    ? "ì°¸ì¡° ?´ë?ì§€ë¥?ê¸°ë°˜?¼ë¡œ ?ìƒ ?ŒìŠ¤ë¥??ì„±?©ë‹ˆ?? ?˜ë¥´?Œë‚˜ ?ì„± ?†ì´ ë°”ë¡œ ì§„í–‰ ê°€?¥í•©?ˆë‹¤."
                    : "?„ì—???ì„±???˜ë¥´?Œë‚˜ë¥??œìš©?˜ì—¬ ?ìƒ ?ŒìŠ¤ë¥?ë§Œë“­?ˆë‹¤."}{" "}
                  ?€ë³??ëŠ” ?œí€€?¤ë³„ ?¥ë©´???…ë ¥?´ì£¼?¸ìš”.
                </p>
                <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-4 mb-4">
                  <p className="text-green-200 text-sm mb-2">
                    <strong>?…ë ¥ ë°©ë²•:</strong>
                  </p>
                  <ul className="text-green-300 text-sm space-y-1 ml-4">
                    <li>
                      ? <strong>?„ì²´ ?€ë³?</strong> ?„ì „???¤í¬ë¦½íŠ¸???¤í† ë¦¬ë?
                      ?…ë ¥
                    </li>
                    <li>
                      ? <strong>?œí€€?¤ë³„ ?¥ë©´:</strong> ê°?ì¤„ì— ?˜ë‚˜???¥ë©´
                      ?¤ëª…???…ë ¥
                    </li>
                  </ul>
                </div>
              </div>

              {/* ?¼ê???? ì? (? íƒ?¬í•­) - ?ìƒ ?ŒìŠ¤ ?ì„±?¼ë¡œ ?´ë™ */}
              <div className="mb-6 bg-green-900/20 border border-green-500/50 rounded-lg p-6">
                <h3 className="text-green-300 font-medium mb-3 flex items-center">
                  <span className="mr-2">?”</span>
                  ?¼ê???? ì? (? íƒ?¬í•­)
                </h3>
                <p className="text-green-200 text-sm mb-3">
                  ì°¸ì¡° ?´ë?ì§€ë¥??…ë¡œ?œí•˜ë©??´ë‹¹ ?´ë?ì§€???¤í??¼ê³¼ ?¼ê??±ì„
                  ? ì??˜ë©° ?ìƒ ?ŒìŠ¤ë¥??ì„±?©ë‹ˆ??
                  {!referenceImage &&
                    " ì°¸ì¡° ?´ë?ì§€ê°€ ?ˆìœ¼ë©??˜ë¥´?Œë‚˜ ?ì„± ?†ì´??ë°”ë¡œ ?ìƒ ?ŒìŠ¤ë¥?ë§Œë“¤ ???ˆìŠµ?ˆë‹¤!"}
                </p>

                {!referenceImage ? (
                  <div className="border-2 border-dashed border-green-400 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReferenceImageUpload}
                      className="hidden"
                      id="referenceImageInput"
                    />
                    <label
                      htmlFor="referenceImageInput"
                      className="cursor-pointer flex flex-col items-center space-y-2 hover:text-green-300 transition-colors"
                    >
                      <div className="text-3xl">?–¼ï¸?</div>
                      <div className="text-green-300 font-medium">
                        ì°¸ì¡° ?´ë?ì§€ ?…ë¡œ??
                      </div>
                      <div className="text-green-400 text-sm">
                        ?´ë¦­?˜ì—¬ ?´ë?ì§€ë¥?? íƒ?˜ì„¸??
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="relative bg-gray-900 rounded-lg p-4">
                    <div className="flex items-center space-x-4">
                      <img
                        src={`data:image/jpeg;base64,${referenceImage}`}
                        alt="ì°¸ì¡° ?´ë?ì§€"
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <div className="text-green-300 font-medium">
                          ì°¸ì¡° ?´ë?ì§€ ?…ë¡œ?œë¨
                        </div>
                        <div className="text-green-400 text-sm">
                          ???´ë?ì§€???¤í??¼ì„ ì°¸ê³ ?˜ì—¬ ?ìƒ ?ŒìŠ¤ë¥??ì„±?©ë‹ˆ??
                        </div>
                      </div>
                      <button
                        onClick={handleRemoveReferenceImage}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                      >
                        ?? œ
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <textarea
                value={videoSourceScript}
                onChange={(e) => setVideoSourceScript(e.target.value)}
                placeholder="?€ë³??„ì²´ë¥??£ìœ¼?¸ìš”. ?ëŠ” ?œí€€?¤ë³„ ?í•˜???¥ë©´???£ìœ¼?¸ìš”.

?ˆì‹œ:
1. ë¯¸ë˜ ?„ì‹œ ?¥ìƒ?ì„œ ë¡œë´‡???ˆë²½??ë°”ë¼ë³´ë©° ???ˆëŠ” ?¥ë©´
2. ê³µì¤‘?•ì›?ì„œ ?€ë¡œê·¸???˜ë¹„?¤ì´ ì¶¤ì¶”??ëª¨ìŠµ  
3. ?¤ì˜¨?¬ì¸??ë°˜ì‚¬??ë¹—ì† ê±°ë¦¬ë¥?ê±¸ì–´ê°€???¬ì´ë³´ê·¸
4. ?°ì£¼ ?•ê±°??ì°½ë¬¸ ?ˆë¨¸ë¡?ì§€êµ¬ë? ?´ë ¤?¤ë³´???¥ë©´"
                className="w-full h-48 p-4 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200 resize-y mb-4"
              />

              {/* ?ì„± ?µì…˜ ?¤ì • */}
              <div className="mb-4 bg-green-900/20 border border-green-500/50 rounded-lg p-4">
                <h3 className="text-green-300 font-medium mb-3 flex items-center">
                  <span className="mr-2">?™ï¸</span>
                  ?ì„± ?µì…˜ ?¤ì •
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ?ë§‰ ?¤ì • */}
                  <div>
                    <label className="block text-sm font-medium text-green-200 mb-2">
                      ?’¬ ?ë§‰ ?¤ì •
                    </label>
                    <select
                      value={subtitleEnabled ? "on" : "off"}
                      onChange={(e) =>
                        setSubtitleEnabled(e.target.value === "on")
                      }
                      className="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg text-green-200 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="off">?š« ?ë§‰ OFF (ê¸°ë³¸ê°?</option>
                      <option value="on">???ë§‰ ON</option>
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      ?ë§‰ ?¬í•¨ ?¬ë?ë¥?? íƒ?˜ì„¸??
                    </p>
                  </div>

                  {/* ?´ë?ì§€ ???¤ì • */}
                  <div>
                    <Slider
                      label="?ì„±???´ë?ì§€ ??
                      min={5}
                      max={20}
                      value={Math.min(imageCount, 20)}
                      onChange={(e) => setImageCount(parseInt(e.target.value))}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      ?ˆì •?ì¸ ?ì„±???„í•´ ìµœë? 20ê°œë¡œ ?œí•œ
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <button
                  onClick={handleGenerateVideoSource}
                  disabled={
                    isLoadingVideoSource ||
                    !videoSourceScript.trim() ||
                    !apiKey.trim() ||
                    (characters.length === 0 && !referenceImage) ||
                    (hasContentWarning && !isContentWarningAcknowledged)
                  }
                  className="w-full sm:w-auto px-6 py-3 bg-green-600 font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 flex items-center justify-center"
                >
                  {isLoadingVideoSource ? (
                    <>
                      <Spinner size="sm" />{" "}
                      <span className="ml-2">?ìƒ ?ŒìŠ¤ ?ì„± ì¤?..</span>
                    </>
                  ) : (
                    "?ìƒ ?ŒìŠ¤ ?ì„±"
                  )}
                </button>
                {characters.length === 0 && !referenceImage && (
                  <p className="text-yellow-400 text-sm mt-2">
                    ?’¡ ?ìƒ ?ŒìŠ¤ë¥??ì„±?˜ë ¤ë©??„ì—???˜ë¥´?Œë‚˜ë¥?ë¨¼ì? ?ì„±?˜ê±°?? ì°¸ì¡° ?´ë?ì§€ë¥??…ë¡œ?œí•´ì£¼ì„¸??
                  </p>
                )}
              </div>
            </section>

            {/* ?ìƒ ?ŒìŠ¤ ?ì„± ê´€???¤ë¥˜ ?œì‹œ */}
            {error && (
              <div className="bg-red-900/50 border border-red-500 text-red-300 p-4 rounded-lg">
                <div className="flex items-start">
                  <span className="text-red-400 text-xl mr-3">
                    {error.startsWith("?") ? "?" : "?"}
                  </span>
                  <div className="flex-1">
                    <pre className="font-medium mb-2 whitespace-pre-wrap text-sm leading-relaxed">{error}</pre>
                  </div>
                </div>
              </div>
            )}

            {isLoadingVideoSource && (
              <div className="text-center p-8">
                <Spinner size="lg" />
                <p className="mt-4 text-green-300 text-lg font-semibold">
                  ?¥ë©´??ë§Œë“¤ê³??ˆìŠµ?ˆë‹¤...
                </p>
                {loadingProgress && (
                  <div className="mt-4 bg-green-900/30 border border-green-500/50 rounded-lg p-4 max-w-md mx-auto">
                    <p className="text-green-300 font-bold text-lg animate-pulse">
                      ? {loadingProgress}
                    </p>
                  </div>
                )}
                <p className="mt-4 text-gray-400 text-sm">
                  ? API ê³¼ë???ë°©ì?ë¥??„í•´ ?´ë?ì§€ ê°?3-4ì´??€ê¸??œê°„???ˆìŠµ?ˆë‹¤.
                </p>
                <p className="mt-2 text-gray-500 text-xs">
                  ???‘ì—…?€ ?œê°„??ê±¸ë¦´ ???ˆìŠµ?ˆë‹¤. ? ì‹œë§?ê¸°ë‹¤??ì£¼ì„¸??
                </p>
              </div>
            )}

            {videoSource.length > 0 && (
              <section>
                <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                  <h2 className="text-2xl font-bold text-blue-300">
                    ?ì„±???ìƒ ?ŒìŠ¤
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={handleGenerateVideoSource}
                      disabled={
                        isLoadingVideoSource ||
                        !videoSourceScript.trim() ||
                        !apiKey.trim() ||
                        (hasContentWarning && !isContentWarningAcknowledged)
                      }
                      className="px-4 py-2 bg-blue-600 font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center"
                    >
                      {isLoadingVideoSource ? (
                        <>
                          <Spinner size="sm" />
                          <span className="ml-2">?ì„± ì¤?..</span>
                        </>
                      ) : (
                        "??ë²????ì„±"
                      )}
                    </button>
                    <button
                      onClick={handleDownloadAllImages}
                      disabled={isDownloading}
                      className="px-4 py-2 bg-green-600 font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center"
                    >
                      {isDownloading ? (
                        <>
                          <Spinner size="sm" />
                          <span className="ml-2">?•ì¶• ì¤?..</span>
                        </>
                      ) : (
                        "ëª¨ë“  ?´ë?ì§€ ?€??
                      )}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {videoSource.map((item) => (
                    <StoryboardImage
                      key={item.id}
                      item={item}
                      onRegenerate={handleRegenerateVideoSourceImage}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ê´‘ê³  3: ?ìƒ ?ŒìŠ¤ ?ì„±ê³?ì¹´ë©”???µê? ?ì„± ?¬ì´ */}
            <AdBanner />

            {/* 4?¨ê³„: ì¹´ë©”???µê? ?•ì¥ */}
            <section className="bg-gray-800 p-6 rounded-xl shadow-2xl border-2 border-orange-500">
              <h2 className="text-2xl font-bold mb-4 text-orange-400 flex items-center">
                <span className="mr-2">3ï¸âƒ£</span>
                ?¬ì§„ êµ¬ë„ ?•ì¥ (ìµœë? 6ê°€ì§€ ?µê?)
              </h2>
              <p className="text-orange-200 text-sm mb-4">
                ?í•˜???µê???? íƒ?˜ì—¬ ?¤ì–‘??êµ¬ë„???´ë?ì§€ë¥??ì„±?©ë‹ˆ??
              </p>

              {/* ì¤‘ìš” ?ˆë‚´ */}
              <div className="mb-4 bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
                <p className="text-blue-300 text-sm font-semibold mb-2">
                  ?§­ ?‘ë™ ë°©ì‹
                </p>
                <ul className="text-blue-200 text-xs space-y-1 list-disc list-inside">
                  <li><strong>1?¨ê³„:</strong> Gemini Vision AIê°€ ?…ë¡œ?œí•œ ?´ë?ì§€ë¥??ì„¸??ë¶„ì„ (?¼ì‚¬ì²? ì¡°ëª…, ?¤í?????</li>
                  <li><strong>2?¨ê³„:</strong> ë¶„ì„ ê²°ê³¼ë¥?ë°”íƒ•?¼ë¡œ ? íƒ???µê?ë³„ë¡œ ?´ë?ì§€ ?¬ìƒ??/li>
                  <li><strong>ëª©í‘œ:</strong> ?™ì¼???¼ì‚¬ì²´ë? ?¤ì–‘??ì¹´ë©”??ê°ë„?ì„œ ?œí˜„</li>
                  <li><strong>? ì˜?¬í•­:</strong> AI ?¬ìƒ?±ì´ë¯€ë¡?100% ?™ì¼?˜ì? ?Šì„ ???ˆìŒ</li>
                  <li><strong>ì²˜ë¦¬ ?œê°„:</strong> API ?œí•œ?¼ë¡œ ?µê???5-6ì´??Œìš” (6ê°?? íƒ ????30-40ì´?</li>
                </ul>
              </div>

              {/* ?´ë?ì§€ ?…ë¡œ???¹ì…˜ */}
              <div className="mb-6 bg-orange-900/20 border border-orange-500/50 rounded-lg p-6">
                <h3 className="text-orange-300 font-medium mb-3 flex items-center">
                  <span className="mr-2">?“·</span>
                  ë¶„ì„???ë³¸ ?´ë?ì§€ ?…ë¡œ??
                </h3>
                <p className="text-orange-200 text-sm mb-3">
                  ?´ë?ì§€ë¥??…ë¡œ?œí•˜ë©?AIê°€ ?ì„¸??ë¶„ì„???? ? íƒ??ì¹´ë©”???µê?ë¡??¬ìƒ?±í•©?ˆë‹¤.
                </p>

                {!cameraAngleSourceImage ? (
                  <div className="border-2 border-dashed border-orange-400 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleCameraAngleImageUpload}
                      className="hidden"
                      id="cameraAngleImageInput"
                    />
                    <label
                      htmlFor="cameraAngleImageInput"
                      className="cursor-pointer flex flex-col items-center space-y-2 hover:text-orange-300 transition-colors"
                    >
                      <div className="text-3xl">?–¼ï¸?</div>
                      <div className="text-orange-300 font-medium">
                        ?ë³¸ ?´ë?ì§€ ?…ë¡œ??
                      </div>
                      <div className="text-orange-400 text-sm">
                        ?´ë¦­?˜ì—¬ ?´ë?ì§€ë¥?? íƒ?˜ì„¸??
                      </div>
                      <div className="text-orange-300 text-xs mt-2">
                        JPG, PNG, WEBP ?•ì‹ ì§€??(ìµœë? 10MB)
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="relative bg-gray-900 rounded-lg p-4">
                    <div className="flex items-center space-x-4">
                      <img
                        src={cameraAngleSourceImage}
                        alt="ì¹´ë©”???µê? ?ë³¸ ?´ë?ì§€"
                        className="w-20 h-20 object-cover rounded-lg border-2 border-orange-400"
                      />
                      <div className="flex-1">
                        <p className="text-orange-300 font-medium">?ë³¸ ?´ë?ì§€ ?…ë¡œ???„ë£Œ</p>
                        <p className="text-orange-400 text-sm">10ê°€ì§€ ?µê?ë¡?ë³€?˜í•  ì¤€ë¹„ê? ?˜ì—ˆ?µë‹ˆ??/p>
                      </div>
                      <button
                        onClick={() => {
                          setCameraAngleSourceImage(null);
                          setCameraAngles([]);
                          setCameraAngleError(null);
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold"
                      >
                        ?? œ
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ?µê? ? íƒ ?¹ì…˜ */}
              <div className="mb-6 bg-orange-900/20 border border-orange-500/50 rounded-lg p-6">
                <h3 className="text-orange-300 font-medium mb-3 flex items-center">
                  <span className="mr-2">?</span>
                  ?ì„±???µê? ? íƒ ({selectedCameraAngles.length}/6)
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'Front View' as CameraAngle, label: '?•ë©´', emoji: '?™‚', direction: '' },
                    { value: 'Right Side View' as CameraAngle, label: '?¤ë¥¸ìª?ì¸¡ë©´', emoji: '?™‚', direction: '(?¼ìª½??ë°”ë¼ë´?' },
                    { value: 'Left Side View' as CameraAngle, label: '?¼ìª½ ì¸¡ë©´', emoji: '?™‚', direction: '(?¤ë¥¸ìª½ì„ ë°”ë¼ë´?' },
                    { value: 'Back View' as CameraAngle, label: '?·ëª¨??, emoji: '?™‚', direction: '' },
                    { value: 'Full Body' as CameraAngle, label: '?„ì‹ ', emoji: '?™‚', direction: '' },
                    { value: 'Close-up Face' as CameraAngle, label: '?¼êµ´ ê·¼ì ‘', emoji: '?™‚', direction: '' },
                  ].map((angle) => (
                    <label
                      key={angle.value}
                      className={`flex items-center p-3 rounded-lg cursor-pointer transition-all ${
                        selectedCameraAngles.includes(angle.value)
                          ? 'bg-orange-600/40 border-2 border-orange-400'
                          : 'bg-gray-700/50 border-2 border-gray-600 hover:bg-gray-600/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCameraAngles.includes(angle.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCameraAngles([...selectedCameraAngles, angle.value]);
                          } else {
                            setSelectedCameraAngles(selectedCameraAngles.filter(a => a !== angle.value));
                          }
                        }}
                        className="w-5 h-5 mr-3"
                      />
                      <span className="text-xl mr-2">{angle.emoji}</span>
                      <div className="flex flex-col">
                        <span className="text-orange-200 font-medium text-sm">{angle.label}</span>
                        {angle.direction && (
                          <span className="text-orange-300/60 text-xs">{angle.direction}</span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex space-x-2">
                  <button
                    onClick={() => setSelectedCameraAngles([
                      'Front View', 'Right Side View', 'Left Side View', 'Back View', 'Full Body', 'Close-up Face'
                    ])}
                    className="px-3 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700"
                  >
                    ?„ì²´ ? íƒ
                  </button>
                  <button
                    onClick={() => setSelectedCameraAngles([])}
                    className="px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
                  >
                    ?„ì²´ ?´ì œ
                  </button>
                </div>
              </div>

              {/* ë¹„ìœ¨ ? íƒ */}
              <div className="mb-4">
                <label className="block text-orange-300 text-sm mb-2 font-semibold">
                  ?“ ?ì„±???´ë?ì§€ ë¹„ìœ¨
                </label>
                <AspectRatioSelector
                  selectedRatio={aspectRatio}
                  onRatioChange={setAspectRatio}
                />
              </div>

              {/* ?ì„± ë²„íŠ¼ - ë¡œë”© ì¤‘ì´ ?„ë‹ ?Œë§Œ ?œì‹œ */}
              {!isLoadingCameraAngles && (
                <>
                  <button
                    onClick={handleGenerateCameraAngles}
                    disabled={!cameraAngleSourceImage || !apiKey || selectedCameraAngles.length === 0}
                    className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
                      !cameraAngleSourceImage || !apiKey || selectedCameraAngles.length === 0
                        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-lg hover:shadow-xl transform hover:scale-105"
                    }`}
                  >
                    ?? ? íƒ??{selectedCameraAngles.length}ê°€ì§€ ?µê? ?ì„±?˜ê¸°
                  </button>

                  {!apiKey && (
                    <p className="text-yellow-400 text-sm mt-2">
                      ? ï¸ ?œë²„ API ?¤ê? ?¤ì •?˜ì? ?Šì•˜?µë‹ˆ?? ê´€ë¦¬ì?ê²Œ ë¬¸ì˜?´ì£¼?¸ìš”.
                    </p>
                  )}
                </>
              )}

              {/* ë¡œë”© ì¤?ì§„í–‰ ?í™© ?œì‹œ - ì£¼í™©??ë°•ìŠ¤ë§??œì‹œ */}
              {isLoadingCameraAngles && cameraAngleProgress && (
                <div className="mt-6">
                  <div className="bg-gradient-to-br from-orange-900/40 to-orange-800/30 border-2 border-orange-500 rounded-xl p-8 shadow-2xl">
                    <div className="flex flex-col items-center space-y-4">
                      <Spinner size="lg" />
                      <div className="text-center">
                        <p className="text-orange-300 font-bold text-2xl animate-pulse">
                          ? {cameraAngleProgress}
                        </p>
                        <p className="mt-3 text-orange-400 text-base">
                          ? ?µê? ê°?5-6ì´??€ê¸?(API ? ë‹¹??ë³´í˜¸)
                        </p>
                        <p className="mt-2 text-orange-500 text-sm">
                          ? íƒ??{selectedCameraAngles.length}ê°€ì§€ ?µê? ?ì„±?ëŠ” ??{Math.ceil(selectedCameraAngles.length * 6 / 60)}ë¶??Œìš”
                        </p>
                        <div className="mt-4 bg-orange-950/50 rounded-lg p-3">
                          <p className="text-orange-300 text-xs">
                            ?±ï¸ ?ì„± ì¤‘ì—??ë¸Œë¼?°ì?ë¥??«ì? ë§ˆì„¸??
                          </p>
                          <p className="text-orange-400 text-xs mt-1">
                            ? ï¸ ? ë‹¹??ì´ˆê³¼ ???ì„±???´ë?ì§€ë§??€?¥ë©?ˆë‹¤
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ?ëŸ¬ ë©”ì‹œì§€ */}
              {cameraAngleError && !isLoadingCameraAngles && (
                <div className="mt-4 p-4 bg-red-900/30 border border-red-600 rounded-lg">
                  <pre className="text-red-400 text-sm whitespace-pre-wrap font-mono">
                    {cameraAngleError}
                  </pre>
                </div>
              )}

              {/* ?ì„±??ì¹´ë©”???µê? ê²°ê³¼ ê·¸ë¦¬??*/}
              {cameraAngles.length > 0 && !isLoadingCameraAngles && (
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-orange-300">
                      ?“¸ ?ì„±??ì¹´ë©”???µê? ({cameraAngles.length}ê°?
                    </h3>
                    <button
                      onClick={async () => {
                        try {
                          let successCount = 0;
                          let cancelCount = 0;
                          
                          for (let index = 0; index < cameraAngles.length; index++) {
                            const angleImg = cameraAngles[index];
                            const fileName = `${index + 1}_${angleImg.angleName}.png`;
                            
                            try {
                              const base64Data = angleImg.image.includes(',') 
                                ? angleImg.image.split(',')[1] 
                                : angleImg.image;
                              const base64Response = await fetch(`data:image/png;base64,${base64Data}`);
                              const blob = await base64Response.blob();
                              
                              if ('showSaveFilePicker' in window) {
                                try {
                                  const handle = await (window as any).showSaveFilePicker({
                                    suggestedName: fileName,
                                    types: [
                                      {
                                        description: '?´ë?ì§€ ?Œì¼',
                                        accept: {
                                          'image/png': ['.png'],
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
                                    cancelCount++;
                                    console.log(`[${index + 1}/${cameraAngles.length}] ?¬ìš©?ê? ?€?¥ì„ ì·¨ì†Œ?ˆìŠµ?ˆë‹¤.`);
                                  } else {
                                    throw err;
                                  }
                                }
                              } else {
                                const link = document.createElement('a');
                                link.href = URL.createObjectURL(blob);
                                link.download = fileName;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                URL.revokeObjectURL(link.href);
                                successCount++;
                                await new Promise(resolve => setTimeout(resolve, 300));
                              }
                            } catch (err) {
                              console.error(`[ê°œë°œ?ìš©] ì¹´ë©”???µê? ${index + 1} ?¤ìš´ë¡œë“œ ?¤ë¥˜:`, err);
                              throw err;
                            }
                          }
                          
                          if (successCount > 0) {
                            setCameraAngleError(`? ${successCount}ê°œì˜ ì¹´ë©”???µê????€?¥ë˜?ˆìŠµ?ˆë‹¤!` + 
                                    (cancelCount > 0 ? ` (${cancelCount}ê°?ì·¨ì†Œ??` : ''));
                          } else if (cancelCount > 0) {
                            setCameraAngleError(`ëª¨ë“  ?¤ìš´ë¡œë“œê°€ ì·¨ì†Œ?˜ì—ˆ?µë‹ˆ??`);
                          }
                        } catch (error) {
                          console.error("[ê°œë°œ?ìš©] ì¹´ë©”???µê? ?¤ìš´ë¡œë“œ ?¤ë¥˜:", error);
                          
                          let userMessage = "ì¹´ë©”???µê? ?¤ìš´ë¡œë“œ???¤íŒ¨?ˆìŠµ?ˆë‹¤. ?¤ì‹œ ?œë„??ì£¼ì„¸??";
                          
                          if (error instanceof Error) {
                            console.error(`[ê°œë°œ?ìš©] ?¤ë¥˜ ?ì„¸: ${error.name} - ${error.message}`);
                            
                            if (error.name === 'NotAllowedError') {
                              userMessage = "?Œì¼ ?€??ê¶Œí•œ??ê±°ë??˜ì—ˆ?µë‹ˆ?? ë¸Œë¼?°ì? ?¤ì •???•ì¸??ì£¼ì„¸??";
                            } else if (error.name === 'SecurityError') {
                              userMessage = "ë³´ì•ˆ ë¬¸ì œë¡??Œì¼???€?¥í•  ???†ìŠµ?ˆë‹¤. ë¸Œë¼?°ì?ë¥??…ë°?´íŠ¸?˜ê±°???¤ë¥¸ ë¸Œë¼?°ì?ë¥??¬ìš©??ì£¼ì„¸??";
                            }
                          }
                          
                          setCameraAngleError(userMessage);
                        }
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
                    >
                      â¬‡ï¸ ?„ì²´ ?¤ìš´ë¡œë“œ ({cameraAngles.length}ê°?
                    </button>
                  </div>

                  {/* 4??x 5??ê·¸ë¦¬??*/}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {cameraAngles.map((angleImg) => (
                      <div
                        key={angleImg.id}
                        className="bg-gray-700 rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-all transform hover:scale-105"
                      >
                        <div className="relative aspect-square">
                          <img
                            src={angleImg.image}
                            alt={angleImg.angleName}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => {
                              // ?ˆì°½?¼ë¡œ ?´ë?ì§€ ?´ê¸°
                              openImageInNewWindow(angleImg.image, `ì¹´ë©”???µê? - ${angleImg.angleName}`);
                            }}
                          />
                        </div>
                        <div className="p-3">
                          <h4 className="font-bold text-white text-sm mb-1">
                            {angleImg.angleName}
                          </h4>
                          <p className="text-gray-400 text-xs mb-2 line-clamp-2">
                            {angleImg.description}
                          </p>
                          <button
                            onClick={async () => {
                              try {
                                // Base64ë¥?Blob?¼ë¡œ ë³€??
                                const response = await fetch(angleImg.image);
                                const blob = await response.blob();
                                
                                // File System Access API ì§€???•ì¸
                                if ('showSaveFilePicker' in window) {
                                  try {
                                    const handle = await (window as any).showSaveFilePicker({
                                      suggestedName: `ì¹´ë©”???µê?-${angleImg.angleName}.jpg`,
                                      types: [
                                        {
                                          description: '?´ë?ì§€ ?Œì¼',
                                          accept: {
                                            'image/jpeg': ['.jpg', '.jpeg'],
                                          },
                                        },
                                      ],
                                    });
                                    
                                    const writable = await handle.createWritable();
                                    await writable.write(blob);
                                    await writable.close();
                                  } catch (err: any) {
                                    if (err.name !== 'AbortError') {
                                      throw err;
                                    }
                                  }
                                } else {
                                  // ?´ë°±: ê¸°ì¡´ ?¤ìš´ë¡œë“œ ë°©ì‹
                                  const link = document.createElement('a');
                                  link.href = URL.createObjectURL(blob);
                                  link.download = `ì¹´ë©”???µê?-${angleImg.angleName}.jpg`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  URL.revokeObjectURL(link.href);
                                }
                              } catch (error) {
                                console.error("[ê°œë°œ?ìš©] ?´ë?ì§€ ?¤ìš´ë¡œë“œ ?¤ë¥˜:", error);
                              }
                            }}
                            className="w-full py-2 bg-orange-600 text-white rounded text-xs font-semibold hover:bg-orange-700 transition-colors"
                          >
                            â¬‡ï¸ ?¤ìš´ë¡œë“œ
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* ?ìƒ ?œì‘ ?„êµ¬ ë°°ë„ˆ */}
            <section className="my-8">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-lg shadow-lg text-center">
                <h3 className="text-xl font-bold mb-2">
                  ?’¡ ??ë§ì? ?ìƒ ?œì‘ ?„êµ¬ê°€ ?„ìš”?˜ì‹ ê°€??
                </h3>
                <p className="mb-4">
                  ?„ë¡œ?˜ì…”?í•œ ?ìƒ ?¸ì§‘ê³??¨ê³¼ë¥??„í•œ ?„êµ¬?¤ì„ ?•ì¸?´ë³´?¸ìš”!
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <a
                    href="https://youtube.money-hotissue.com"
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition-all shadow-md hover:shadow-xl cursor-pointer"
                  >
                    ?”¥ ?¡ìƒ???€ë³?1ë¶?ì¹´í”¼
                  </a>
                  <a
                    href="https://aimusic.money-hotissue.com/"
                    className="px-6 py-3 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-lg font-semibold hover:from-sky-600 hover:to-sky-700 transform hover:scale-105 transition-all shadow-md hover:shadow-xl cursor-pointer"
                  >
                    ?µ AI ?Œì•… ê°€??1ì´??„ì„±
                  </a>
                  <a
                    href="https://aimusic.money-hotissue.com/"
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-semibold hover:from-indigo-600 hover:to-indigo-700 transform hover:scale-105 transition-all shadow-md hover:shadow-xl cursor-pointer"
                  >
                    ?–¼ï¸?AI ?Œì•… ?¸ë„¤???œì‘
                  </a>
                </div>
              </div>
            </section>
          </main>

          {/* Footer */}
          <footer className="mt-16 py-8 border-t border-gray-700">
            <div className="max-w-4xl mx-auto px-4">
              <div className="text-center space-y-4">
                {/* ?€?‘ê¶Œ ?œì‹œ */}
                <p className="text-gray-500 text-sm">
                  ??{new Date().getFullYear()} ? íŠœë¸?ë¡±í¼ ?´ë?ì§€ ?ì„±ê¸? ëª¨ë“  ê¶Œë¦¬ ë³´ìœ .
                </p>
              </div>
            </div>
          </footer>
        </div>
      </div>
      <FloatingBottomAd />

      {/* ì´ˆê¸°??ë²„íŠ¼ - ?¤ë¥¸ìª??˜ë‹¨ ê³ ì • */}
      <button
        onClick={handleResetAll}
        className="fixed bottom-24 right-6 z-[10000] px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 flex items-center gap-2 border-2 border-red-500"
        title="ëª¨ë“  ?‘ì—… ?°ì´??ì´ˆê¸°??
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
            clipRule="evenodd"
          />
        </svg>
        ì´ˆê¸°??
      </button>
    </>
  );
};

export default App;



