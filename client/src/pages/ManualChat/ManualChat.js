"use client"
import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { debounce } from "lodash";
import "./chat.css"
import {
  MdAttachment,
  MdSend,
  MdArrowBack,
  MdSearch,
  MdPhone,
  MdExpandMore,
  MdUndo,
  MdClear,
  MdBrush,
  MdPinEnd,
  MdReply,
  MdClose,
  MdRectangle,
  MdCircle,
  MdArrowForward,
  MdZoomIn,
  MdZoomOut,
  MdCenterFocusWeak,
  MdRedo,
} from "react-icons/md"
import { TfiText } from "react-icons/tfi";
import ScrollToBottom from "react-scroll-to-bottom"
import axios from "axios"
import { GetData } from "../../utils/sessionStoreage"
import toast from "react-hot-toast"
import AccessDenied from "../../components/AccessDenied/AccessDenied"
import { useSocket } from "../../context/SocketContext"
import { useNavigate, useLocation } from "react-router-dom"
import { Modal, Dropdown } from "react-bootstrap"
import "bootstrap/dist/css/bootstrap.min.css"
import CanvasDraw from "react-canvas-draw"
import { Pencil, Hand } from "lucide-react"
import VoiceRecorder from "./VoiceRecorder"; // Adjust the path as needed

const ENDPOINT = "https://testapi.dessobuild.com/"
const MAX_FILE_SIZE = 5 * 1024 * 1024

// Custom hook to get mouse position adjusted for zoom
const useAdjustedMousePosition = (containerRef, zoomLevel, panOffset) => {
  const getAdjustedMousePosition = (e) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };

    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left - panOffset.x) / zoomLevel;
    const y = (e.clientY - rect.top - panOffset.y) / zoomLevel;

    return { x, y };
  };

  return getAdjustedMousePosition;
};

const ManualChat = () => {
  // Existing state management
  const [showModal, setShowModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [isFetchingChatStatus, setIsFetchingChatStatus] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState([])
  const [chatData, setChatData] = useState([])
  const [socketId, setSocketId] = useState("")
  const [isChatBoxActive, setIsChatBoxActive] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [status, setStatus] = useState("offline")
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [selectedProviderIds, setSelectedProviderIds] = useState([])
  const [isChatStarted, setIsChatStarted] = useState(false)
  const [isAbleToJoinChat, setIsAbleToJoinChat] = useState(false)
  const [allGroupChats, setAllGroupChats] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [currentRoomId, setCurrentRoomId] = useState(null)
  const [isMobileView, setIsMobileView] = useState(false)
  const [showChatList, setShowChatList] = useState(true)
  const [isChatOnGoing, setIsChatOnGoing] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [nextPath, setNextPath] = useState(null)
  const [isUserConfirming, setIsUserConfirming] = useState(false)
  const [selectedChat, setSelectedChat] = useState(null)
  const [connectedProviders, setConnectedProviders] = useState(new Set())
  const [groupMembers, setGroupMembers] = useState([])
  const [isChatEnded, setIsChatEnded] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState(null)

  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Add state for dynamic canvas dimensions
  const [originalWidth, setOriginalWidth] = useState(800);
  const [originalHeight, setOriginalHeight] = useState(600);

  // Add new state for unified history
  const [annotationHistory, setAnnotationHistory] = useState([]);
  const [annotationHistoryIndex, setAnnotationHistoryIndex] = useState(-1);
  // Add state to track ongoing drawing action
  const [isDrawing, setIsDrawing] = useState(false);

  // Enhanced Reply functionality states
  const [replyingTo, setReplyingTo] = useState(null)
  const [showReplyOptions, setShowReplyOptions] = useState({})

  // Enhanced Canvas annotation states
  const [brushColor, setBrushColor] = useState("#000000")
  const [brushRadius, setBrushRadius] = useState(2)
  const [isAnnotating, setIsAnnotating] = useState(false)
  const canvasRef = useRef()

  // Enhanced Text Annotation States
  const [textElements, setTextElements] = useState([])
  const [isAddingText, setIsAddingText] = useState(false)
  const [selectedTextId, setSelectedTextId] = useState(null)
  const [textInput, setTextInput] = useState("")
  const [textPosition, setTextPosition] = useState(null)
  const [textSettings, setTextSettings] = useState({
    fontSize: 18,
    color: "#000000",
    fontFamily: "Arial",
    fontWeight: "normal",
    fontStyle: "normal",
    textDecoration: "none",
    textAlign: "left",
    backgroundColor: "transparent",
    padding: 4,
  })
  useEffect(() => {
    if (selectedImage?.content && showModal && containerRef.current) {
      const img = new Image();
      img.src = selectedImage.content;
      img.onload = () => {
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        const containerWidth = rect.width;
        const containerHeight = rect.height;
        const imgWidth = img.naturalWidth;
        const imgHeight = img.naturalHeight;

        // Calculate zoom to fit image within container, capped at 100%
        const zoomToFitWidth = (containerWidth - 20) / imgWidth; // Add padding
        const zoomToFitHeight = (containerHeight - 20) / imgHeight; // Add padding
        const newZoom = Math.min(zoomToFitWidth, zoomToFitHeight, 1);

        // Set canvas dimensions to image's natural size
        setOriginalWidth(imgWidth);
        setOriginalHeight(imgHeight);

        // Center the image
        const scaledWidth = imgWidth * newZoom;
        const scaledHeight = imgHeight * newZoom;
        const offsetX = (containerWidth - scaledWidth) / 2;
        const offsetY = (containerHeight - scaledHeight) / 2;

        setZoomLevel(newZoom);
        setPanOffset({ x: offsetX, y: offsetY });
      };
      img.onerror = () => {
        console.error("Failed to load image for sizing");
        setOriginalWidth(800);
        setOriginalHeight(600);
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        const offsetX = (rect.width - 800) / 2;
        const offsetY = (rect.height - 600) / 2;
        setZoomLevel(1);
        setPanOffset({ x: offsetX, y: offsetY });
      };
    }
  }, [selectedImage, showModal]);

  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [textHistory, setTextHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isDragging, setIsDragging] = useState(false)
  const [isEditingText, setIsEditingText] = useState(false)
  const [editingTextId, setEditingTextId] = useState(null)
  const [editingTextValue, setEditingTextValue] = useState("")
  const [groupName, setGroupName] = useState("")
  const [isEditingGroupName, setIsEditingGroupName] = useState(false)

  // Enhanced Drawing Tool States
  const [drawingTool, setDrawingTool] = useState("brush") // brush, rectangle, circle, arrow, line, eraser
  const [shapes, setShapes] = useState([])
  const [isDrawingShape, setIsDrawingShape] = useState(false)
  const [shapeStart, setShapeStart] = useState(null)
  const [currentShape, setCurrentShape] = useState(null)

  // Enhanced Eraser States
  const [eraserRadius, setEraserRadius] = useState(10)

  // Zoom functionality states
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 })

  // Add participants mapping for better sender resolution
  const [participantsMap, setParticipantsMap] = useState(new Map())

  const navigate = useNavigate()
  const location = useLocation()
  const textCanvasRef = useRef()
  const modalRef = useRef()
  const editTextInputRef = useRef()
  const containerRef = useRef()
  const shapeCanvasRef = useRef()

  // Custom hook for adjusted mouse position
  const getAdjustedMousePosition = useAdjustedMousePosition(containerRef, zoomLevel, panOffset);

  // User data from session storage
  const userData = useMemo(() => {
    const data = GetData("user")
    return data ? JSON.parse(data) : null
  }, [])

  const socket = useSocket()

  // Debounced saveAnnotationState to prevent rapid state saves
  const saveAnnotationState = useCallback(
    debounce(() => {
      const canvasData = canvasRef.current ? canvasRef.current.getSaveData() : null;
      const currentState = {
        canvas: canvasData,
        textElements: [...textElements],
        shapes: [...shapes],
        zoom: zoomLevel,
      };

      // Only add to history if the state has changed
      if (
        annotationHistoryIndex === -1 ||
        JSON.stringify(annotationHistory[annotationHistoryIndex]) !== JSON.stringify(currentState)
      ) {
        setAnnotationHistory((prev) => {
          // Trim history to current index to avoid orphaned future states
          const newHistory = prev.slice(0, annotationHistoryIndex + 1);
          newHistory.push(currentState);
          return newHistory;
        });
        setAnnotationHistoryIndex((prev) => prev + 1);
      }
    }, 100), // Reduced to 100ms for faster response
    [textElements, shapes, annotationHistoryIndex]
  );

  // Enhanced function to build participants map
  const buildParticipantsMap = useCallback(
    (chatData) => {
      const map = new Map()
      // Add current user
      if (userData) {
        map.set(userData._id, {
          name: "You",
          role: userData.role,
          isCurrentUser: true,
        })
      }

      // Add chat user
      if (chatData?.userId) {
        map.set(chatData.userId._id, {
          name: chatData.userId.name,
          role: "user",
          isCurrentUser: chatData.userId._id === userData?._id,
        })
      }

      // Add providers
      if (chatData?.providerIds && Array.isArray(chatData.providerIds)) {
        chatData.providerIds.forEach((provider) => {
          map.set(provider._id, {
            name: provider.name,
            role: "provider",
            isCurrentUser: provider._id === userData?._id,
          })
        })
      }

      setParticipantsMap(map)
      return map
    },
    [userData],
  )

  // Enhanced getSenderInfo function
  const getSenderInfo = useCallback(
    (senderId) => {
      // First check the participants map
      if (participantsMap.has(senderId)) {
        return participantsMap.get(senderId)
      }

      // Fallback to current user check
      if (senderId === userData?._id) {
        return { name: "You", role: userData?.role, isCurrentUser: true }
      }

      // Fallback to selectedChat check
      if (selectedChat?.userId?._id === senderId) {
        return {
          name: selectedChat.userId.name,
          role: "user",
          isCurrentUser: false,
        }
      }

      // Check providers in selectedChat
      const provider = selectedChat?.providerIds?.find((p) => p._id === senderId)
      if (provider) {
        return {
          name: provider.name,
          role: "provider",
          isCurrentUser: false,
        }
      }

      // Last resort - try to find in messages for any stored sender info
      const messageWithSender = messages.find(
        (msg) => (msg.sender === senderId || msg.senderId === senderId) && msg.senderName,
      )
      if (messageWithSender) {
        return {
          name: messageWithSender.senderName,
          role: messageWithSender.senderRole || "unknown",
          isCurrentUser: false,
        }
      }

      return { name: "Unknown User", role: "unknown", isCurrentUser: false }
    },
    [participantsMap, userData, selectedChat, messages],
  )

  // Enhanced Reply functionality functions
  const handleReplyClick = useCallback(
    (message, messageIndex) => {
      const senderInfo = getSenderInfo(message.sender || message.senderId)
      setReplyingTo({
        ...message,
        messageIndex,
        senderName: senderInfo.name,
        senderRole: senderInfo.role,
        originalTimestamp: message.timestamp,
      })
      setShowReplyOptions({})
    },
    [getSenderInfo],
  )

  const cancelReply = useCallback(() => {
    setReplyingTo(null)
  }, [])

  const toggleReplyOptions = useCallback((messageIndex) => {
    setShowReplyOptions((prev) => ({
      ...prev,
      [messageIndex]: !prev[messageIndex],
    }))
  }, [])

  // Modified addTextToHistory to integrate with unified history
  const addTextToHistory = useCallback(
    (elements) => {
      setTextElements(elements);
      saveAnnotationState();
    },
    [saveAnnotationState],
  );

  // Update relevant useEffect and event handlers to save state after changes
  useEffect(() => {
    // Save initial state when starting annotation
    if (isAnnotating && annotationHistory.length === 0) {
      saveAnnotationState();
    }
  }, [isAnnotating, saveAnnotationState]);

  const generateTextId = () => `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Modified addTextElement to save state only once
  const addTextElement = useCallback(
    (x, y, text) => {
      if (!text.trim()) return;

      const newElement = {
        id: generateTextId(),
        text: text.trim(),
        x,
        y,
        fontSize: textSettings.fontSize,
        color: textSettings.color,
        fontFamily: textSettings.fontFamily,
        fontWeight: textSettings.fontWeight,
        fontStyle: textSettings.fontStyle,
        textDecoration: textSettings.textDecoration,
        textAlign: textSettings.textAlign,
        backgroundColor: textSettings.backgroundColor,
        padding: textSettings.padding,
        zIndex: textElements.length + 1,
        rotation: 0,
      };

      const newElements = [...textElements, newElement];
      setTextElements(newElements);
      saveAnnotationState();
      setTextInput("");
      setTextPosition(null);
      setIsAddingText(false);
    },
    [textElements, textSettings, saveAnnotationState]
  );

  // Modified updateTextElement to save state only once
  const updateTextElement = useCallback(
  (id, updates) => {
    const newElements = textElements.map((el) => (el.id === id ? { ...el, ...updates } : el));
    setTextElements(newElements);
    saveAnnotationState();
  },
  [textElements, saveAnnotationState]
);

  // Modified deleteTextElement to save state only once
  const deleteTextElement = useCallback(
    (id) => {
      const newElements = textElements.filter((el) => el.id !== id);
      setTextElements(newElements);
      saveAnnotationState();
      setSelectedTextId(null);
    },
    [textElements, saveAnnotationState]
  );

  // Handle drag enter
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  }, []);

  // Handle drag leave
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  }, []);

  // Handle drop
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);

      const file = e.dataTransfer.files[0];
      if (!file) {
        toast.error("No file dropped");
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast.error("Only image files are allowed");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error("File size should not exceed 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const fileData = {
            name: file.name,
            type: file.type,
            content: reader.result,
          };
          setSelectedImage(fileData);
          setIsAnnotating(true); // Enable annotation mode for the new image
          setTextElements([]);
          setShapes([]);
          setAnnotationHistory([]);
          setAnnotationHistoryIndex(-1);
          if (canvasRef.current) {
            canvasRef.current.clear();
          }
        } catch (error) {
          toast.error("Failed to process dropped image");
          console.error("Error processing dropped image:", error);
        }
      };

      reader.onerror = () => {
        toast.error("Failed to read dropped image");
      };

      reader.readAsDataURL(file);
    },
    [MAX_FILE_SIZE]
  );

  // Modified duplicateTextElement to save state only once
  const duplicateTextElement = useCallback(
    (id) => {
      const element = textElements.find((el) => el.id === id);
      if (!element) return;

      const newElement = {
        ...element,
        id: generateTextId(),
        x: element.x + 20,
        y: element.y + 20,
        zIndex: textElements.length + 1,
      };

      const newElements = [...textElements, newElement];
      setTextElements(newElements);
      saveAnnotationState();
    }, [textElements, saveAnnotationState]);

  const undoTextAction = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setTextElements([...textHistory[historyIndex - 1]]);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      setTextElements([]);
    }
  }, [historyIndex, textHistory]);

  const redoTextAction = useCallback(() => {
    if (historyIndex < textHistory.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setTextElements([...textHistory[historyIndex + 1]]);
    }
  }, [historyIndex, textHistory]);

  // Enhanced Eraser Functions
  const checkShapeCollision = useCallback(
    (x, y, radius) => {
      return shapes.filter((shape) => {
        switch (shape.type) {
          case "rectangle":
            const rectLeft = Math.min(shape.startX, shape.endX);
            const rectRight = Math.max(shape.startX, shape.endX);
            const rectTop = Math.min(shape.startY, shape.endY);
            const rectBottom = Math.max(shape.startY, shape.endY);

            return (
              x + radius >= rectLeft &&
              x - radius <= rectRight &&
              y + radius >= rectTop &&
              y - radius <= rectBottom
            );

          case "circle":
            const centerX = shape.startX;
            const centerY = shape.startY;
            const shapeRadius = Math.sqrt(
              Math.pow(shape.endX - shape.startX, 2) + Math.pow(shape.endY - shape.startY, 2)
            );
            const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
            return distance <= shapeRadius + radius;

          case "line":
          case "arrow":
            // Distance from point to line segment
            const A = x - shape.startX;
            const B = y - shape.startY;
            const C = shape.endX - shape.startX;
            const D = shape.endY - shape.startY;

            const dot = A * C + B * D;
            const lenSq = C * C + D * D;
            let param = -1;
            if (lenSq !== 0) param = dot / lenSq;

            let xx, yy;
            if (param < 0) {
              xx = shape.startX;
              yy = shape.startY;
            } else if (param > 1) {
              xx = shape.endX;
              yy = shape.endY;
            } else {
              xx = shape.startX + param * C;
              yy = shape.startY + param * D;
            }

            const dx = x - xx;
            const dy = y - yy;
            const distanceToLine = Math.sqrt(dx * dx + dy * dy);
            return distanceToLine <= radius + shape.radius;

          default:
            return false;
        }
      });
    },
    [shapes]
  );

  // Zoom functionality
  const handleZoom = useCallback(
    (delta, mouseX = null, mouseY = null) => {
      const zoomFactor = delta > 0 ? 1.1 : 0.9;
      const newZoom = Math.min(Math.max(zoomLevel * zoomFactor, 0.1), 5);

      if (newZoom !== zoomLevel) {
        const container = containerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          if (mouseX === null || mouseY === null) {
            mouseX = rect.left + rect.width / 2;
            mouseY = rect.top + rect.height / 2;
          }
          const px = mouseX - rect.left;
          const py = mouseY - rect.top;

          const newPanOffset = {
            x: px - newZoom * ((px - panOffset.x) / zoomLevel),
            y: py - newZoom * ((py - panOffset.y) / zoomLevel),
          };

          setZoomLevel(newZoom);
          setPanOffset(newPanOffset);
        }
      }
    },
    [zoomLevel, panOffset]
  );

  const handleWheel = useCallback(
    (e) => {
      e.preventDefault();
      handleZoom(-e.deltaY, e.clientX, e.clientY);
    },
    [handleZoom]
  );

  const handleFitToScreen = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const containerWidth = rect.width;
      const containerHeight = rect.height;
      const zoomToFitHeight = (containerHeight - 20) / originalHeight;
      const newZoom = Math.min(zoomToFitHeight, 5);
      const scaledWidth = originalWidth * newZoom;
      const scaledHeight = originalHeight * newZoom;
      const offsetY = (containerHeight - scaledHeight) / 2;
      const offsetX = scaledWidth < containerWidth ? (containerWidth - scaledWidth) / 2 : 0;
      setZoomLevel(newZoom);
      setPanOffset({ x: offsetX, y: offsetY });
    }
  }, [originalWidth, originalHeight]);

  const resetZoom = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const offsetX = (rect.width - originalWidth) / 2;
      const offsetY = (rect.height - originalHeight) / 2;
      setPanOffset({ x: offsetX, y: offsetY });
    }
    setZoomLevel(1);
  }, [originalWidth, originalHeight]);

  // Pan functionality
  const handleMouseDown = useCallback((e) => {
    if (e.button === 1 || (e.button === 0 && (e.ctrlKey || !isAnnotating || drawingTool === "pan"))) {
      // Middle mouse or Ctrl+Left click or Left click in preview mode or pan mode
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  }, [isAnnotating, drawingTool]);

  const handleMouseMove = useCallback(
    (e) => {
      if (isPanning) {
        const deltaX = e.clientX - lastPanPoint.x;
        const deltaY = e.clientY - lastPanPoint.y;
        setPanOffset((prev) => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY,
        }));
        setLastPanPoint({ x: e.clientX, y: e.clientY });
      }
    },
    [isPanning, lastPanPoint]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Shape drawing functions
  const drawShape = useCallback((ctx, shape) => {
    const scaledStartX = shape.startX * zoomLevel;
    const scaledStartY = shape.startY * zoomLevel;
    const scaledEndX = shape.endX * zoomLevel;
    const scaledEndY = shape.endY * zoomLevel;
    const scaledRadius = shape.radius * zoomLevel;

    ctx.strokeStyle = shape.color;
    ctx.lineWidth = scaledRadius;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    switch (shape.type) {
      case "rectangle":
        ctx.strokeRect(scaledStartX, scaledStartY, scaledEndX - scaledStartX, scaledEndY - scaledStartY);
        break;
      case "circle":
        const radius = Math.sqrt(Math.pow(scaledEndX - scaledStartX, 2) + Math.pow(scaledEndY - scaledStartY, 2));
        ctx.beginPath();
        ctx.arc(scaledStartX, scaledStartY, radius, 0, 2 * Math.PI);
        ctx.stroke();
        break;
      case "arrow":
        const headlen = 10 * zoomLevel;
        const dx = scaledEndX - scaledStartX;
        const dy = scaledEndY - scaledStartY;
        const angle = Math.atan2(dy, dx);
        ctx.beginPath();
        ctx.moveTo(scaledStartX, scaledStartY);
        ctx.lineTo(scaledEndX, scaledEndY);
        ctx.lineTo(
          scaledEndX - headlen * Math.cos(angle - Math.PI / 6),
          scaledEndY - headlen * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(scaledEndX, scaledEndY);
        ctx.lineTo(
          scaledEndX - headlen * Math.cos(angle + Math.PI / 6),
          scaledEndY - headlen * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
        break;
      case "line":
        ctx.beginPath();
        ctx.moveTo(scaledStartX, scaledStartY);
        ctx.lineTo(scaledEndX, scaledEndY);
        ctx.stroke();
        break;
    }
  }, [zoomLevel]);

  const renderShapes = useCallback(() => {
    const canvas = shapeCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    shapes.forEach((shape) => {
      drawShape(ctx, shape);
    });

    if (currentShape) {
      drawShape(ctx, currentShape);
    }
  }, [shapes, currentShape, drawShape]);

  useEffect(() => {
    renderShapes();
  }, [renderShapes]);

  const getEraserCursor = useCallback(() => {
    const cursorCanvas = document.createElement("canvas");
    cursorCanvas.width = eraserRadius * 2 + 2;
    cursorCanvas.height = eraserRadius * 2 + 2;
    const ctx = cursorCanvas.getContext("2d");
    ctx.beginPath();
    ctx.arc(eraserRadius + 1, eraserRadius + 1, eraserRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    ctx.stroke();
    return `url(${cursorCanvas.toDataURL()}) ${eraserRadius + 1} ${eraserRadius + 1}, auto`;
  }, [eraserRadius]);

  // Enhanced Canvas Click Handler
  const handleCanvasClick = useCallback(
    (e) => {
      if (isAddingText) {
        const canvas = e.currentTarget;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / zoomLevel;
        const y = (e.clientY - rect.top) / zoomLevel;
        setTextPosition({ x, y });
        e.stopPropagation();
      }
    },
    [isAddingText]
  );

  // Modified handleShapeMouseDown to handle eraser for brush strokes and shapes
  const handleShapeMouseDown = useCallback(
    (e) => {
      const canvas = e.currentTarget;
      const rect = canvas.getBoundingClientRect();
      const visual_x = e.clientX - rect.left;
      const visual_y = e.clientY - rect.top;
      const logical_x = visual_x / zoomLevel;
      const logical_y = visual_y / zoomLevel;

      if (drawingTool === "eraser") {
        setIsDrawing(true); // Start continuous erasing
        if (canvasRef.current) {
          const drawingCanvas = canvasRef.current.canvas.drawing;
          const ctx = drawingCanvas.getContext("2d");
          ctx.save();
          ctx.beginPath();
          ctx.arc(visual_x, visual_y, eraserRadius, 0, 2 * Math.PI);
          ctx.clip();
          ctx.clearRect(visual_x - eraserRadius, visual_y - eraserRadius, eraserRadius * 2, eraserRadius * 2);
          ctx.restore();
        }

        // Erase shapes
        const collidingShapes = checkShapeCollision(logical_x, logical_y, eraserRadius / zoomLevel);
        if (collidingShapes.length > 0) {
          let topIndex = -1;
          let topShape = null;
          collidingShapes.forEach((shape) => {
            const idx = shapes.indexOf(shape);
            if (idx > topIndex) {
              topIndex = idx;
              topShape = shape;
            }
          });

          if (topShape) {
            setShapes((prev) => prev.filter((s) => s !== topShape));
            saveAnnotationState();
          }
        }
      } else if (["rectangle", "circle", "arrow", "line"].includes(drawingTool)) {
        setIsDrawingShape(true);
        setShapeStart({ x: logical_x, y: logical_y });
        setCurrentShape({
          type: drawingTool,
          startX: logical_x,
          startY: logical_y,
          endX: logical_x,
          endY: logical_y,
          color: brushColor,
          radius: brushRadius / zoomLevel,
        });
      }
    },
    [drawingTool, brushColor, brushRadius, eraserRadius, checkShapeCollision, shapes, saveAnnotationState, zoomLevel]
  );

  // Modified handleShapeMouseMove to handle continuous erasing
  const handleShapeMouseMove = useCallback(
    (e) => {
      const canvas = e.currentTarget;
      const rect = canvas.getBoundingClientRect();
      const visual_x = e.clientX - rect.left;
      const visual_y = e.clientY - rect.top;
      const logical_x = visual_x / zoomLevel;
      const logical_y = visual_y / zoomLevel;

      if (isDrawingShape && shapeStart) {
        setCurrentShape((prev) => ({
          ...prev,
          endX: logical_x,
          endY: logical_y,
        }));
      } else if (drawingTool === "eraser" && isDrawing) {
        // Continuous erasing for brush strokes
        if (canvasRef.current) {
          const drawingCanvas = canvasRef.current.canvas.drawing;
          const ctx = drawingCanvas.getContext("2d");
          ctx.save();
          ctx.beginPath();
          ctx.arc(visual_x, visual_y, eraserRadius, 0, 2 * Math.PI);
          ctx.clip();
          ctx.clearRect(visual_x - eraserRadius, visual_y - eraserRadius, eraserRadius * 2, eraserRadius * 2);
          ctx.restore();
        }

        // Continuous erasing for shapes
        const collidingShapes = checkShapeCollision(logical_x, logical_y, eraserRadius / zoomLevel);
        if (collidingShapes.length > 0) {
          let topIndex = -1;
          let topShape = null;
          collidingShapes.forEach((shape) => {
            const idx = shapes.indexOf(shape);
            if (idx > topIndex) {
              topIndex = idx;
              topShape = shape;
            }
          });

          if (topShape) {
            setShapes((prev) => prev.filter((s) => s !== topShape));
            saveAnnotationState();
          }
        }
      }
    },
    [isDrawingShape, shapeStart, drawingTool, eraserRadius, checkShapeCollision, shapes, isDrawing, saveAnnotationState, zoomLevel]
  );

  const handleShapeMouseUp = useCallback(() => {
    if (isDrawingShape && currentShape) {
      setShapes((prev) => [...prev, currentShape]);
      setCurrentShape(null);
      setIsDrawingShape(false);
      setShapeStart(null);
      saveAnnotationState();
    }
    if (drawingTool === "eraser") {
      setIsDrawing(false);
      saveAnnotationState();
    }
  }, [isDrawingShape, currentShape, drawingTool, saveAnnotationState]);

  // Enhanced Text Drag Handlers
  const handleTextMouseDown = useCallback(
    (e, textId) => {
      e.preventDefault();
      e.stopPropagation();

      const textElement = textElements.find((el) => el.id === textId);
      if (!textElement) return;

      const canvas = textCanvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left) / zoomLevel;
      const canvasY = (e.clientY - rect.top) / zoomLevel;

      const offsetX = canvasX - textElement.x;
      const offsetY = canvasY - textElement.y;

      setDragOffset({ x: offsetX, y: offsetY });
      setSelectedTextId(textId);
      setIsDragging(true);

      const handleMouseMove = (moveEvent) => {
        if (!canvas) return;

        const canvasRect = canvas.getBoundingClientRect();
        const newCanvasX = (moveEvent.clientX - canvasRect.left) / zoomLevel;
        const newCanvasY = (moveEvent.clientY - canvasRect.top) / zoomLevel;

        const newX = Math.max(0, Math.min(originalWidth - 100, newCanvasX - offsetX));
        const newY = Math.max(
          textElement.fontSize,
          Math.min(originalHeight - textElement.fontSize, newCanvasY - offsetY)
        );

        updateTextElement(textId, { x: newX, y: newY });
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [textElements, updateTextElement, zoomLevel, originalWidth, originalHeight]
  );

  // Text Double Click Handler for Editing
  const handleTextDoubleClick = useCallback(
  (textId) => {
    const element = textElements.find((el) => el.id === textId);
    if (!element) return;

    setIsEditingText(true);
    setEditingTextId(textId);
    setEditingTextValue(element.text);
    setSelectedTextId(textId);
    // Set text settings based on the selected element
    setTextSettings({
      fontSize: element.fontSize,
      color: element.color,
      fontFamily: element.fontFamily,
      fontWeight: element.fontWeight,
      fontStyle: element.fontStyle,
      textDecoration: element.textDecoration,
      textAlign: element.textAlign,
      backgroundColor: element.backgroundColor,
      padding: element.padding,
    });

    setTimeout(() => {
      if (editTextInputRef.current) {
        editTextInputRef.current.focus();
        editTextInputRef.current.select();
      }
    }, 100);
  },
  [textElements]
);

  // Save Text Edit
  const saveTextEdit = useCallback(() => {
  if (editingTextId && editingTextValue.trim()) {
    updateTextElement(editingTextId, {
      text: editingTextValue.trim(),
      fontSize: textSettings.fontSize,
      color: textSettings.color,
      fontFamily: textSettings.fontFamily,
    });
  }
  setIsEditingText(false);
  setEditingTextId(null);
  setEditingTextValue("");
}, [editingTextId, editingTextValue, textSettings, updateTextElement]);

  // Cancel Text Edit
  const cancelTextEdit = useCallback(() => {
    setIsEditingText(false);
    setEditingTextId(null);
    setEditingTextValue("");
  }, []);

  // Modified handleSendAnnotation to use dynamic canvas dimensions
  const handleSendAnnotation = async () => {
    setLoading(true);
    if (!canvasRef.current || !selectedImage?.content) return;

    try {
      const drawingCanvas = canvasRef.current.canvas.drawing;
      const textCanvas = textCanvasRef.current;
      const shapeCanvas = shapeCanvasRef.current;

      const width = originalWidth; // Use dynamic width
      const height = originalHeight; // Use dynamic height

      // Create merged canvas
      const mergedCanvas = document.createElement("canvas");
      mergedCanvas.width = width;
      mergedCanvas.height = height;
      const ctx = mergedCanvas.getContext("2d");

      const backgroundImg = new Image();
      backgroundImg.crossOrigin = "anonymous";
      backgroundImg.src = selectedImage.content;

      backgroundImg.onload = () => {
        // Draw background image at original size
        ctx.drawImage(backgroundImg, 0, 0, width, height);

        // Draw shapes
        if (shapeCanvas) {
          ctx.drawImage(shapeCanvas, 0, 0, width, height);
        }

        // Draw drawing annotations
        ctx.drawImage(drawingCanvas, 0, 0, width, height);

        // Draw text annotations
        textElements.forEach((element) => {
          ctx.font = `${element.fontStyle} ${element.fontWeight} ${element.fontSize}px ${element.fontFamily}`;
          ctx.fillStyle = element.color;
          ctx.textAlign = element.textAlign;
          ctx.textBaseline = "top";

          let textX = element.x;
          if (element.textAlign === "center") {
            textX += element.padding + (element.width || ctx.measureText(element.text).width) / 2;
          } else if (element.textAlign === "right") {
            textX += element.padding + (element.width || ctx.measureText(element.text).width);
          } else {
            textX += element.padding;
          }

          const textY = element.y + element.padding;

          if (element.backgroundColor !== "transparent") {
            const textWidth = ctx.measureText(element.text).width;
            const textHeight = element.fontSize;
            ctx.fillStyle = element.backgroundColor;
            ctx.fillRect(element.x, element.y, textWidth + element.padding * 2, textHeight + element.padding * 2);
            ctx.fillStyle = element.color;
          }

          ctx.fillText(element.text, textX, textY);

          if (element.textDecoration === "underline") {
            const textWidth = ctx.measureText(element.text).width;
            const underlineY = textY + element.fontSize + 2;
            ctx.fillRect(textX, underlineY, textWidth, 1);
          }
        });

        const mergedDataUrl = mergedCanvas.toDataURL("image/png");

        const annotatedFile = {
          name: `annotated_${selectedImage?.name || "image.png"}`,
          type: "image/png",
          content: mergedDataUrl,
        };

        const currentUserInfo = getSenderInfo(userData._id);

        socket.emit("manual_file_upload", {
          room: currentRoomId,
          fileData: annotatedFile,
          senderId: userData._id,
          senderName: currentUserInfo.name,
          senderRole: currentUserInfo.role,
          timestamp: new Date().toISOString(),
          ...(replyingTo && {
            replyTo: {
              messageId: replyingTo.messageIndex.toString(),
              text: replyingTo.text || (replyingTo.file ? "Image" : ""),
              senderName: replyingTo.senderName,
              senderRole: replyingTo.senderRole,
              isFile: !!replyingTo.file,
              timestamp: replyingTo.originalTimestamp,
            },
          }),
        });

        toast.success("Annotated image sent to chat!");
        setShowModal(false);
        setIsAnnotating(false);
        setTextElements([]);
        setTextHistory([]);
        setHistoryIndex(-1);
        setShapes([]);
        if (replyingTo) cancelReply();
      };

      backgroundImg.onerror = () => {
        toast.error("Failed to load background image");
      };
    } catch (error) {
      toast.error("Failed to send annotated image");
      console.error("Error sending annotation:", error);
    } finally {
      setLoading(false);
    }
  };

  // Modified handleClear to reset history
  const handleClear = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.clear();
    }
    setTextElements([]);
    setShapes([]);
    setCurrentShape(null);
    setAnnotationHistory([]);
    setAnnotationHistoryIndex(-1);
    saveAnnotationState();
  }, [saveAnnotationState]);

  // Modified handleUndo to reliably restore one step back
  const handleUndo = useCallback(() => {
    if (annotationHistoryIndex <= 0) {
      if (canvasRef.current) {
        canvasRef.current.clear();
      }
      setTextElements([]);
      setShapes([]);
      setAnnotationHistoryIndex(0);
      return;
    }

    const previousIndex = annotationHistoryIndex - 1;
    const previousState = annotationHistory[previousIndex];

    if (canvasRef.current) {
      if (previousState.canvas) {
        try {
          let saveData = JSON.parse(previousState.canvas);
          if (saveData) {
            const scaleFactor = zoomLevel / previousState.zoom;
            saveData.lines.forEach((line) => {
              line.points.forEach((p) => {
                p.x *= scaleFactor;
                p.y *= scaleFactor;
              });
              line.brushRadius *= scaleFactor;
            });
            canvasRef.current.loadSaveData(JSON.stringify(saveData), true);
          }
        } catch (error) {
          console.error("Failed to restore canvas:", error);
          canvasRef.current.clear();
        }
      } else {
        canvasRef.current.clear();
      }
    }

    setTextElements([...previousState.textElements]);
    setShapes([...previousState.shapes]);
    setAnnotationHistoryIndex(previousIndex);
  }, [annotationHistory, annotationHistoryIndex, zoomLevel]);

  // Add handleRedo to restore undone steps
  const handleRedo = useCallback(() => {
    if (annotationHistoryIndex >= annotationHistory.length - 1) {
      return;
    }

    const nextIndex = annotationHistoryIndex + 1;
    const nextState = annotationHistory[nextIndex];

    if (canvasRef.current) {
      if (nextState.canvas) {
        try {
          let saveData = JSON.parse(nextState.canvas);
          if (saveData) {
            const scaleFactor = zoomLevel / nextState.zoom;
            saveData.lines.forEach((line) => {
              line.points.forEach((p) => {
                p.x *= scaleFactor;
                p.y *= scaleFactor;
              });
              line.brushRadius *= scaleFactor;
            });
            canvasRef.current.loadSaveData(JSON.stringify(saveData), true);
          }
        } catch (error) {
          console.error("Failed to restore canvas:", error);
          canvasRef.current.clear();
        }
      } else {
        canvasRef.current.clear();
      }
    }

    setTextElements([...nextState.textElements]);
    setShapes([...nextState.shapes]);
    setAnnotationHistoryIndex(nextIndex);
  }, [annotationHistory, annotationHistoryIndex, zoomLevel]);

  // Handle click outside text elements to unselect
  const handleCanvasWrapperClick = useCallback(
    (e) => {
      if (isDragging) {
        return;
      }

      const clickedOnTextElement = e.target.closest(".text-element");
      const clickedOnTextInput = e.target.closest(".form-control.form-control-sm");
      const clickedOnEditTextModalContent = e.target.closest(".chat-screen-text-edit-modal");

      if (!clickedOnTextElement && !clickedOnTextInput && !clickedOnEditTextModalContent) {
        setSelectedTextId(null);
        if (isAddingText && !textInput.trim()) {
          setTextPosition(null);
          setIsAddingText(false);
        }
      }
    },
    [isDragging, isAddingText, textInput]
  );

  // Check for mobile view
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Modified CanvasDraw mouse events to ensure state is saved only on completion
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current.canvas.drawing;
      const handleDrawStart = () => {
        setIsDrawing(true);
      };
      const handleDrawEnd = () => {
        if (isDrawing) {
          saveAnnotationState();
          setIsDrawing(false);
        }
      };

      canvas.addEventListener("mousedown", handleDrawStart);
      canvas.addEventListener("mouseup", handleDrawEnd);
      canvas.addEventListener("mouseleave", handleDrawEnd);

      return () => {
        canvas.removeEventListener("mousedown", handleDrawStart);
        canvas.removeEventListener("mouseup", handleDrawEnd);
        canvas.removeEventListener("mouseleave", handleDrawEnd);
      };
    }
  }, [isDrawing, saveAnnotationState]);

  // Handle image click
  const handleImageClick = (image) => {
    setSelectedImage(image);
    setShowModal(true);
    setIsAnnotating(false);
    setTextElements([]);
    setTextHistory([]);
    setHistoryIndex(-1);
    setShapes([]);
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Handle modal close
  const handleCloseModal = () => {
    setShowModal(false);
    setIsAnnotating(false);
    setTextElements([]);
    setTextHistory([]);
    setHistoryIndex(-1);
    setShapes([]);
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    if (canvasRef.current) {
      canvasRef.current.clear();
    }
  };

  // Download URL effect
  useEffect(() => {
    if (!selectedImage?.content) return;

    let url;
    if (typeof selectedImage.content === "string" && selectedImage.content.startsWith("data:image")) {
      url = selectedImage.content;
    } else if (Array.isArray(selectedImage.content)) {
      const byteArray = new Uint8Array(selectedImage.content);
      const blob = new Blob([byteArray], { type: selectedImage.type || "image/jpeg" });
      url = URL.createObjectURL(blob);
    }

    setDownloadUrl(url);

    return () => {
      if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
    };
  }, [selectedImage]);

  // Enhanced download function
  const handleBase64Download = () => {
    try {
      const base64Data = downloadUrl;
      if (!base64Data || typeof base64Data !== "string" || !base64Data.startsWith("data:")) {
        console.error("Invalid base64 data");
        return;
      }

      const parts = base64Data.split(",");
      const byteString = atob(parts[1]);
      const mimeString = parts[0].split(":")[1].split(";")[0];

      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }

      const blob = new Blob([ia], { type: mimeString });
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = "annotated-image.png";
      link.target = "_blank";
      document.body.appendChild(link);

      requestAnimationFrame(() => {
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      });
    } catch (error) {
      console.error("Error during base64 download:", error);
    }
  };

  const id = userData?._id || "";
  const role = userData?.role || "";

  // Handle mobile view chat selection
  const handleChatSelection = (chatId, chat) => {
    handleChatStart(chatId);
    setSelectedChat(chat);
    if (isMobileView) {
      setShowChatList(false);
    }
  };

  // Back to chat list (mobile)
  const handleBackToList = () => {
    setShowChatList(true);
  };

  const fetchWithRetry = async (url, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await axios.get(url);
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, delay));
        console.log(`Retrying fetch attempt ${i + 1}...`);
      }
    }
  };

  // Fetch group chat status
  useEffect(() => {
    const fetchGroupChatStatus = async () => {
      setLoading(true);
      if (!currentRoomId) return;

      setIsFetchingChatStatus(true);
      try {
        const { data } = await fetchWithRetry(
          `${ENDPOINT}api/v1/get-chat-by-id/${currentRoomId}?role=${userData?.role}`
        );
        const chatData = data.data;
        setIsAbleToJoinChat(chatData.isChatStarted);
      } catch (error) {
        console.log("Internal server error", error);
        toast.error("Failed to fetch chat status");
        setIsAbleToJoinChat(false);
      } finally {
        setLoading(false);
        setIsFetchingChatStatus(false);
      }
    };

    if (currentRoomId) {
      fetchGroupChatStatus();
    }
  }, [currentRoomId]);

  // Fetch group chat history
  const fetchGroupChatHistory = useCallback(async () => {
    setLoading(true);
    if (!userData) {
      toast.error("Please login first");
      return;
    }

    try {
      const url =
        userData?.role === "provider"
          ? `${ENDPOINT}api/v1/get_manual_chat_by_providerId/${userData._id}`
          : `${ENDPOINT}api/v1/get_manual_chat_by_userId/${userData._id}`;

      const { data } = await axios.get(url);
      setAllGroupChats(data.data.reverse());
    } catch (error) {
      toast.error(error?.response?.data?.message);
    } finally {
      setLoading(false);
    }
  }, [userData]);

  useEffect(() => {
    fetchGroupChatHistory();
  }, [fetchGroupChatHistory]);

  // Get group members excluding current user
  const getGroupMembers = useCallback(
    (chat) => {
      if (!chat || !userData) return [];

      const members = [];

      // Add user if current user is not the user
      if (chat.userId && chat.userId._id !== userData._id) {
        members.push({
          id: chat.userId._id,
          name: chat.userId.name,
          role: "user",
          phoneNumber: chat.userId.PhoneNumber,
        });
      }

      // Add providers if current user is not in the provider list
      if (chat.providerIds && Array.isArray(chat.providerIds)) {
        chat.providerIds.forEach((provider) => {
          if (provider._id !== userData._id) {
            members.push({
              id: provider._id,
              name: provider.name,
              role: "provider",
              phoneNumber: provider.mobileNumber,
            });
          }
        })
      }

      return members;
    },
    [userData]
  );

  const handleCallMember = useCallback(
    async (member, selectedChat) => {
      setLoading(true);
      if (!userData) {
        toast.error("Please login first");
        return;
      }

      const phoneNumber = member?.phoneNumber;
      if (!phoneNumber) {
        toast.error(`No phone number available for ${member?.name || "this member"}`);
        return;
      }

      const cleanedNumber = phoneNumber.replace(/[^+\d]/g, "");

      try {
        if (cleanedNumber) {
          const room = selectedChat?._id;
          const callFrom = userData.mobileNumber || userData.PhoneNumber;
          const callTo = member?.phoneNumber;

          console.log("all detail =", room, callFrom, callTo);
          const res = await axios.post(`${ENDPOINT}api/v1/create_call_for_free`, {
            roomId: room,
            callFrom,
            callTo,
          });
          toast.success(`Calling ${member.name}...`);
        } else {
          toast.error("Invalid phone number");
        }
      } catch (error) {
        console.log("Internal server error", error);
      } finally {
        setLoading(false);
      }
    },
    [userData]
  );

  // Handle selecting a group chat from the sidebar
  const handleChatStart = useCallback(
    async (chatId) => {
      if (!chatId) return;

      try {
        const { data } = await axios.get(`${ENDPOINT}api/v1/get-chat-by-id/${chatId}?role=${userData?.role}`);
        const chatData = data.data;

        if (!chatData) {
          toast.error("Group chat not found");
          return;
        }

        const userId = chatData?.userId?._id;
        const providerIds = chatData?.providerIds?.map((provider) => provider._id) || [];

        setChatData(chatData || {});
        setSelectedChat(chatData);
        setGroupName(chatData?.groupName || "Group Chat");

        // Build participants map first
        buildParticipantsMap(chatData);

        // Then set messages with enhanced sender info
        const enhancedMessages = (chatData.messages || []).map((msg) => {
          const senderInfo = getSenderInfo(msg.sender);
          return {
            ...msg,
            senderName: senderInfo.name,
            senderRole: senderInfo.role,
          };
        });

        setMessages(enhancedMessages);
        setSelectedUserId(userId);
        setSelectedProviderIds(providerIds);
        setIsChatBoxActive(true);
        setCurrentRoomId(chatId);
        setIsChatStarted(true);
        setIsChatOnGoing(true);
        setGroupMembers(getGroupMembers(chatData));
        setIsChatEnded(chatData?.isGroupChatEnded);

        // Auto-join the room
        if (userData?.role === "provider") {
          socket.emit("join_manual_room", {
            userId: userId,
            astrologerId: userData._id,
            role: "provider",
            room: chatId,
          });
        } else {
          socket.emit("join_manual_room", {
            userId: userId,
            astrologerId: providerIds[0],
            role: userData.role,
            room: chatId,
          });
        }
      } catch (error) {
        toast.error("Failed to load group chat details");
      }
    },
    [userData, socket, getGroupMembers, buildParticipantsMap, getSenderInfo]
  );

  const endGroupChat = useCallback(() => {
    try {
      socket.emit("manual_end_chat", {
        userId: selectedUserId,
        astrologerId: userData?.role === "provider" ? userData._id : selectedProviderIds[0],
        role: userData?.role,
        room: currentRoomId,
      });

      setIsChatStarted(false);
      setIsChatBoxActive(false);
      setIsActive(false);
      setIsChatOnGoing(false);
      setConnectedProviders(new Set());
      setGroupMembers([]);
      fetchGroupChatHistory();
    } catch (error) {
      toast.error("Failed to end group chat properly");
      console.error("Error ending group chat:", error);
    }
  }, [socket, selectedUserId, selectedProviderIds, userData, currentRoomId, fetchGroupChatHistory]);

  // Navigation handling
  useEffect(() => {
    const handleClick = (e) => {
      if (!isChatOnGoing) return;

      const link = e.target.closest("a");
      if (link && link.href && !link.target) {
        const url = new URL(link.href);
        if (url.pathname !== window.location.pathname) {
          e.preventDefault();
          const fullPath = url.pathname + url.search + url.hash;
          setNextPath(fullPath);
          setShowPrompt(true);
        }
      }
    };

    document.body.addEventListener("click", handleClick);
    return () => document.body.removeEventListener("click", handleClick);
  }, [isChatOnGoing]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isChatOnGoing && !isUserConfirming) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isChatOnGoing, isUserConfirming]);

  const confirmNavigation = async () => {
    setIsUserConfirming(true);
    await endGroupChat();
    setShowPrompt(false);
    if (nextPath) {
      navigate(nextPath, { replace: true });
      setNextPath(null);
    } else {
      window.location.reload();
    }
  };

  const cancelNavigation = () => {
    setNextPath(null);
    setShowPrompt(false);
  };

  // Socket event listeners for group chat
  useEffect(() => {
    socket.on("connect", () => {
      setSocketId(socket.id);
      socket.emit("send_socket_id", {
        socketId: socket.id,
        role: userData?.role,
        userId: id,
      });
    });

    socket.on("return_message", (data) => {
      console.log("Received message from others:", data);
      const senderInfo = getSenderInfo(data.sender || data.senderId);

      const messageObj = {
        ...data,
        senderId: data.sender || data.senderId,
        sender: data.sender || data.senderId,
        senderName: data.senderName || senderInfo.name,
        senderRole: data.senderRole || senderInfo.role,
      };

      if (data.file) {
        messageObj.file = {
          name: data.file.name,
          type: data.file.type,
          content: data.file.content,
        };
      }

      if (data.replyTo) {
        messageObj.replyTo = data.replyTo;
      }

      setMessages((prev) => [...prev, messageObj]);
    });

    socket.on("user_status", ({ userId, astrologerId, status, role }) => {
      if (role === "provider") {
        setConnectedProviders((prev) => {
          const newSet = new Set(prev);
          if (status === "online") {
            newSet.add(astrologerId);
          } else {
            newSet.delete(astrologerId);
          }
          return newSet;
        });
      }
      setStatus(status);
    });

    socket.on("room_joined", (data) => {
      console.log("Room joined:", data.message);
    });

    socket.on("error_message", (data) => {
      toast.error(data.message);
      setIsChatBoxActive(false);
    });

    socket.on("wrong_message", (data) => {
      toast.error(data.message);
    });

    socket.on("message_sent", (data) => {
      console.log("Message sent confirmation:", data);
    });

    socket.on("chat_ended", (data) => {
      if (data.success) {
        setIsChatStarted(false);
        setIsChatBoxActive(false);
        setIsActive(false);
        setIsAbleToJoinChat(false);
        setConnectedProviders(new Set());
        setGroupMembers([]);
        toast.success("Group chat ended successfully");
      } else {
        toast.error(data.message || "Error ending group chat");
      }
    });

    return () => {
      socket.off("connect");
      socket.off("return_message");
      socket.off("message_sent");
      socket.off("user_status");
      socket.off("room_joined");
      socket.off("error_message");
      socket.off("wrong_message");
      socket.off("message_sent");
      socket.off("file_upload_success");
      socket.off("file_upload_error");
      socket.off("chat_ended");
    };
  }, [id, socket, userData, selectedProviderIds, getSenderInfo]);

  // Content validation for messages
  const validateMessageContent = useCallback((messageText) => {
    if (!messageText || typeof messageText !== "string" || messageText.trim() === "") {
      return false;
    }

    const prohibitedPatterns = [
      /\b\d{10}\b/,
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,
      /18\+|\bsex\b|\bxxx\b|\bcall\b|\bphone\b|\bmobile|\bteliphone\b|\bnudes\b|\bporn\b|\bsex\scall\b|\btext\b|\bwhatsapp\b|\bskype\b|\btelegram\b|\bfacetime\b|\bvideo\schat\b|\bdial\snumber\b|\bmessage\b/i,
    ];

    return !prohibitedPatterns.some((pattern) => pattern.test(messageText));
  }, []);

  // Enhanced file upload handler
  const handleFileChange = useCallback(
    (event) => {
      const file = event.target.files[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        toast.error("Only image files are allowed");
        event.target.value = "";
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error("File size should not exceed 5MB");
        event.target.value = "";
        return;
      }

      const uploadingToast = toast.loading("Uploading file...");

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const fileData = {
            name: file.name,
            type: file.type,
            content: reader.result,
          };

          const currentUserInfo = getSenderInfo(userData._id);

          socket.emit("manual_file_upload", {
            room: currentRoomId,
            fileData,
            senderId: userData._id,
            senderName: currentUserInfo.name,
            senderRole: currentUserInfo.role,
            timestamp: new Date().toISOString(),
            ...(replyingTo && {
              replyTo: {
                messageId: replyingTo.messageIndex.toString(),
                text: replyingTo.text || (replyingTo.file ? "Image" : ""),
                senderName: replyingTo.senderName,
                senderRole: replyingTo.senderRole,
                isFile: !!replyingTo.file,
                timestamp: replyingTo.originalTimestamp,
              },
            }),
          });

          toast.dismiss(uploadingToast);
          if (replyingTo) cancelReply();
        } catch (error) {
          toast.dismiss(uploadingToast);
          toast.error("Failed to process file");
        }
      };

      reader.onerror = () => {
        toast.dismiss(uploadingToast);
        toast.error("Failed to read file");
      };

      reader.readAsDataURL(file);
      event.target.value = "";
    },
    [userData, currentRoomId, socket, replyingTo, cancelReply, getSenderInfo]
  );

  const handleUpdateGroupName = useCallback(
    async (newGroupName) => {
      if (!newGroupName || typeof newGroupName !== "string") {
        toast.error("Invalid group name");
        return;
      }

      try {
        const response = await axios.put(`${ENDPOINT}api/v1/update_group_name/${currentRoomId}`, {
          groupName: newGroupName,
        });

        if (response.data.success) {
          toast.success("Group name updated successfully");
          setGroupName(newGroupName);
        } else {
          toast.error("Failed to update group name");
        }
      } catch (error) {
        toast.error("An error occurred while updating group name");
      }
    },
    [currentRoomId]
  );

  // Handle message submission with reply support
  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();

      const trimmedMessage = message && typeof message === "string" ? message.trim() : "";

      if (!trimmedMessage) {
        toast.error("Please enter a message");
        return;
      }

      if (!validateMessageContent(trimmedMessage) ) {
        toast.error("Your message contains prohibited content");
        return;
      }

      try {
        const currentUserInfo = getSenderInfo(userData._id);

        const payload = {
          room: currentRoomId,
          message: trimmedMessage,
          senderId: userData._id,
          senderName: currentUserInfo.name,
          senderRole: currentUserInfo.role,
          timestamp: new Date().toISOString(),
          role: userData.role,
          ...(replyingTo && {
            replyTo: {
              messageId: replyingTo.messageIndex.toString(),
              text: replyingTo.text || (replyingTo.file ? "Image" : ""),
              senderName: replyingTo.senderName,
              senderRole: replyingTo.senderRole,
              isFile: !!replyingTo.file,
              timestamp: replyingTo.originalTimestamp,
            },
          }),
        };

        socket.emit("manual_message", payload);
        setMessage("");
        if (replyingTo) cancelReply();
      } catch (error) {
        toast.error("Failed to send message");
      }
    },
    [message, userData, currentRoomId, socket, validateMessageContent, replyingTo, cancelReply, getSenderInfo]
  );

  // Filter group chats based on search term
  const filteredChats = useMemo(() => {
    return allGroupChats.filter((chat) => {
      const groupName = chat?.groupName || "Group Chat";
      return groupName.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [allGroupChats, searchTerm]);

  // Get participant names for display
  const getParticipantNames = (chat) => {
    if (userData?.role === "provider") {
      return chat?.userId?.name || "User";
    } else {
      const providerNames = chat?.providerIds?.map((provider) => provider.name).join(", ") || "Providers";
      return providerNames;
    }
  };

  // const isMobile = window.innerWidth <= 710;
  // const canvasWidth = Math.min(800, window.innerWidth - 50);
  // const canvasHeight = isMobile ? 170 : Math.min(600, window.innerHeight - 100);

  // Compact Color Picker Component
  const CompactColorPicker = ({ brushColor, setBrushColor, brushRadius, setBrushRadius, isEraser }) => {
    const quickColors = [
      "#ff0000",
      "#00ff00",
      "#0000ff",
      "#ffff00",
      "#ff00ff",
      "#00ffff",
      "#000000",
      "#ffffff",
      "#808080",
      "#ff8000",
    ];

    return (
      <div className="compact-brush-controls">
        <div className="color-size-row">
          {!isEraser && (
            <div className="color-section">
              <label>Color:</label>
              <div className="color-options">
                {quickColors.map((color) => (
                  <div
                    key={color}
                    className={`color-dot ${brushColor === color ? "active" : ""}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setBrushColor(color)}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
          <div className="size-section">
            <label>{isEraser ? "Eraser" : ""} Size: {brushRadius}px</label>
            <input
              type="range"
              min="1"
              max="20"
              value={brushRadius}
              onChange={(e) => setBrushRadius(Number.parseInt(e.target.value))}
              className="size-slider"
            />
          </div>
        </div>
      </div>
    );
  };

  if (!userData) {
    return <AccessDenied />;
  }

  if (loading) {
    return (
      <div
        className="d-flex flex-column justify-content-center align-items-center bg-light"
        style={{ height: "100dvh", textAlign: "center" }}
      >
        <div
          className="spinner-border"
          role="status"
          style={{
            width: "3rem",
            height: "3rem",
            borderColor: "#eab936",
            borderRightColor: "transparent",
          }}
        >
          <span className="visually-hidden">Loading...</span>
        </div>
        <h5 className="fw-semibold mb-1 mt-4" style={{ color: "#eab936" }}>
          Fetching Live Projects...
        </h5>
        <small className="text-muted">Please wait while we prepare your workspace.</small>
      </div>
    );
  }

  return (
    <div className="modern-chat-container">
      <div className="container-fluid p-0">
        <div className="row g-0">
          {/* Group Chat List */}
          {(!isMobileView || showChatList) && (
            <div className="col-md-4 chat-list-container">
              <div className="chat-list-header">
                <h3>Group Chats</h3>
                <div className="search-container">
                  <input
                    type="search"
                    className="form-control search-input"
                    placeholder="Search group chats..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <MdSearch className="search-icon" />
                </div>
              </div>

              <div className="chat-list">
                {filteredChats.length > 0 ? (
                  filteredChats.map((chat, index) => (
                    <div
                      key={chat._id || index}
                      className={`chat-list-item ${currentRoomId === chat._id ? "active" : ""}`}
                      onClick={() => handleChatSelection(chat._id, chat)}
                    >
                      <div className="avatar">
                        <img
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                            chat?.groupName || "Group"
                          )}&background=random`}
                          alt={chat?.groupName || "Group Chat"}
                        />
                        <span
                          className={`status-indicator ${connectedProviders.size > 0 ? "online" : "offline"}`}
                        ></span>
                      </div>
                      <div className="chat-info">
                        <div className="chat-name">{chat?.groupName || "Group Chat"}</div>
                        <div className="participants">{getParticipantNames(chat)}</div>
                        <div className="last-message">
                          {chat?.messages?.[chat?.messages.length - 1]?.text ||
                            (chat?.messages?.[chat?.messages.length - 1]?.file
                              ? "File Attached"
                              : "No messages yet")}
                        </div>
                      </div>
                      <div className="chat-meta">
                        {chat?.messages?.length > 0 && (
                          <div className="message-time">
                            {new Date(chat?.messages[chat?.messages.length - 1]?.timestamp).toLocaleTimeString(
                              "en-US",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </div>
                        )}
                        {userData?.role === "user" && (
                          <div className="provider-count">
                            {connectedProviders.size}/{selectedProviderIds.length} online
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-chats">
                    <p>No group chats found</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Group Chat Window */}
          {(!isMobileView || !showChatList) && (
            <div className="col-md-8 chat-window-container">
              {isChatBoxActive ? (
                <>
                  <div className="chatn-header">
                    {isMobileView && (
                      <button className="chatn-back-button" onClick={handleBackToList}>
                        <MdArrowBack size={20} />
                      </button>
                    )}
                    <div className="chatn-user-info">
                      <div className="chatn-avatar">
                        {selectedChat && (
                          <img
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                              groupName || selectedChat?.groupName || "Group"
                            )}&background=random`}
                            alt={groupName || selectedChat?.groupName || "Group Chat"}
                          />
                        )}
                      </div>
                      <div className="chatn-user-details">
                        <div
                          className="chatn-user-name"
                          style={{ display: "flex", alignItems: "center", gap: "8px" }}
                        >
                          {isEditingGroupName ? (
                            <>
                              <input
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleUpdateGroupName(groupName);
                                    setIsEditingGroupName(false);
                                  }
                                }}
                                autoFocus
                                className="group-name-input"
                              />
                              <button
                                onClick={() => {
                                  handleUpdateGroupName(groupName);
                                  setIsEditingGroupName(false);
                                }}
                              >
                                ✅
                              </button>
                            </>
                          ) : (
                            <>
                              <span>{groupName || selectedChat?.groupName || "Group Chat"}</span>
                              <Pencil
                                size={16}
                                style={{ cursor: "pointer" }}
                                onClick={() => setIsEditingGroupName(true)}
                                title="Edit Group Name"
                              />
                            </>
                          )}
                        </div>
                        <div className="chatn-user-status">
                          {userData?.role === "user"
                            ? `${connectedProviders.size}/${selectedProviderIds.length} providers online`
                            : `Group Chat`}
                        </div>
                      </div>
                    </div>
                    <div className="chatn-actions">
                      {groupMembers.length > 0 &&
                        (isChatEnded ? (
                          <></>
                        ) : (
                          <Dropdown>
                            <Dropdown.Toggle
                              variant="outline-primary"
                              id="call-members-dropdown"
                              className="chatn-call-dropdown"
                            >
                              <MdPhone className="me-1" />
                              Call Member
                              <MdExpandMore className="ms-1" />
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                              <Dropdown.Header>Group Members</Dropdown.Header>
                              {groupMembers.map((member) => (
                                <Dropdown.Item
                                  key={member.id}
                                  onClick={() => handleCallMember(member, selectedChat)}
                                  className="d-flex justify-content-between align-items-center"
                                >
                                  <div>
                                    <div className="fw-semibold">{member.name}</div>
                                    <small className="text-muted text-capitalize">{member.role}</small>
                                  </div>
                                  <MdPhone className="text-success" />
                                </Dropdown.Item>
                              ))}
                            </Dropdown.Menu>
                          </Dropdown>
                        ))}
                    </div>
                  </div>

                  {chatData?.PaymentStatus?.toLowerCase() !== "paid" ? (
                    <div className="chatn-payment-warning">
                      <div className="chatn-payment-box">
                        <h2 className="chatn-warning-title">Access Restricted</h2>
                        <p className="chatn-warning-text">
                          To join this group conversation, please complete your payment.
                        </p>
                        <p className="chatn-warning-text-muted">
                          Contact our <strong>support team</strong> for assistance.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <ScrollToBottom className="chatn-messages-container" initialScrollBehavior="smooth">
                      {messages.length === 0 ? (
                        <div className="chatn-no-messages">
                          <p className="chatn-no-messages-text">Send a message to start the group conversation.</p>
                        </div>
                      ) : (
                        messages.map((msg, idx) => {
                          const isOwn = msg.sender === id;
                          const senderInfo = getSenderInfo(msg.sender || msg.senderId);

                          return (
                            <div
                              key={idx}
                              className={`chatn-message ${isOwn ? "chatn-outgoing" : "chatn-incoming"}`}
                            >
                              {!isOwn && (
                                <div className={`chatn-sender-name ${senderInfo.role}`}>{senderInfo.name}</div>
                              )}

                              {msg.replyTo && (
                                <div className="chatn-reply-indicator">
                                  <div className="chatn-reply-line"></div>
                                  <div className="chatn-reply-content">
                                    <div className="chatn-reply-sender">{msg.replyTo.senderName}</div>
                                    <div className="chatn-reply-text">
                                      {msg.replyTo.isFile
                                        ? msg.replyTo.isAudio
                                          ? "🎙️ Voice Note"
                                          : "📷 Image"
                                        : msg.replyTo.text}
                                    </div>
                                    <div className="chatn-reply-time">
                                      {new Date(msg.timestamp).toLocaleTimeString("en-US", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {msg.file && msg.isAudio ? (
                                <div className="chatn-message-bubble chatn-audio-message">
                                  <audio
                                    controls
                                    src={msg.file.content}
                                    className="chatn-message-audio"
                                    onError={(e) => console.error("Audio playback error:", e)}
                                  />
                                  <div className="chatn-message-actions">
                                    <div className="chatn-message-time">
                                      {new Date(msg.timestamp).toLocaleTimeString("en-US", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </div>
                                    <button
                                      className="chatn-reply-button"
                                      onClick={() => handleReplyClick(msg, idx)}
                                      title="Reply to this message"
                                    >
                                      <MdReply size={16} />
                                    </button>
                                  </div>
                                </div>
                              ) : msg.file ? (
                                <div className="chatn-message-bubble chatn-file-message">
                                  <img
                                    src={msg.file.content || "/placeholder.svg"}
                                    alt={msg.file.name}
                                    className="chatn-message-image"
                                    onClick={() => handleImageClick(msg.file)}
                                    style={{ cursor: "pointer" }}
                                    onError={(e) => (e.target.src = "/placeholder.svg")}
                                  />
                                  <div className="chatn-message-actions">
                                    <div className="chatn-message-time">
                                      {new Date(msg.timestamp).toLocaleTimeString("en-US", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </div>
                                    <button
                                      className="chatn-reply-button"
                                      onClick={() => handleReplyClick(msg, idx)}
                                      title="Reply to this message"
                                    >
                                      <MdReply size={16} />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="chatn-message-bubble">
                                  <div className="chatn-message-text">{msg.text}</div>
                                  <div className="chatn-message-actions">
                                    <div className="chatn-message-time">
                                      {new Date(msg.timestamp).toLocaleTimeString("en-US", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </div>
                                    <button
                                      className="chatn-reply-button"
                                      onClick={() => handleReplyClick(msg, idx)}
                                      title="Reply to this message"
                                    >
                                      <MdReply size={16} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </ScrollToBottom>
                  )}

                  {/* Enhanced Image Annotation Modal with Sidebar Layout */}
                  <Modal
                    show={showModal}
                    onHide={handleCloseModal}
                    centered
                    size="xl"
                    className="image-annotation-modal"
                    ref={modalRef}
                  >
                    <Modal.Header closeButton style={{ backgroundColor: '#EDBE3A' }} className="border-0 text-white">
                      <div style={{ display: 'flex' }} className="w-100 align-items-center justify-content-between">
                        <Modal.Title className="d-flex align-items-center gap-2 fw-bold fs-5 mb-0">
                          <MdBrush className="fs-4" />
                          {isAnnotating ? "Annotate Image" : "View Image"}
                        </Modal.Title>

                        <div className="d-flex align-items-center gap-2">
                          {!isChatEnded && (
                            !isAnnotating ? (
                              <button
                                onClick={() => {
                                  setIsAnnotating(true);
                                  // Optional: Reset zoom when entering annotation mode
                                  resetZoom();
                                }}
                                className="btn btn-light btn-sm btn-sm align-items-center gap-1"
                                style={{ display: 'flex' }}
                              >
                                <MdBrush className="fs-6" />
                                <span className="d-none d-sm-inline">Start Editing</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setIsAnnotating(false);
                                  setZoomLevel(1); // Reset zoom
                                  setPanOffset({ x: 0, y: 0 }); // Reset pan
                                }}
                                className="btn btn-outline-light btn-sm align-items-center gap-1"
                                style={{ display: 'flex' }}
                              >
                                <span className="d-none d-sm-inline">Preview Mode</span>
                                <span className="d-sm-none">👁️</span>
                              </button>
                            )
                          )}

                          <button
                            className="btn btn-outline-light btn-sm align-items-center gap-1"
                            style={{ display: 'flex' }}
                            onClick={handleBase64Download}
                          >
                            <MdAttachment className="fs-6" />
                            <span className="d-none d-lg-inline">Download</span>
                          </button>

                          {isAnnotating && (
                            <button
                              onClick={handleSendAnnotation}
                              className="btn btn-success btn-sm align-items-center gap-1"
                              style={{ display: 'flex' }}
                              disabled={loading}
                            >
                              <MdSend className="fs-6" />
                              {loading ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                  <span className="d-none d-sm-inline">Sending...</span>
                                </>
                              ) : (
                                <span className="d-none d-sm-inline">Send</span>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </Modal.Header>

                    <Modal.Body className="p-0" style={{ height: '80vh', overflow: 'hidden' }}>
                      {selectedImage && (
                        <div className="h-100 d-flex flex-column flex-lg-row">
                          {/* Tools Panel - Left Sidebar on Desktop, Top on Mobile */}
                          {isAnnotating && (
                            <div className="tools-panel text-white p-3 order-1 tool-height order-lg-0"
                              style={{ minWidth: "300px", overflowY: 'auto' }}>

                              {/* Drawing Tools Section */}
                              <div className="mb-4">
  <h6 style={{ display: 'flex' }} className="text-black mb-3 align-items-center gap-2">
    <MdBrush className="text-info" /> Drawing Tools
  </h6>

  {/* First Row */}
  <div style={{ display: 'flex' }} className="gap-2 mb-2">
    <button
      className={`btn ${drawingTool === "brush" ? "btn-info text-dark" : "btn-outline-info"}`}
      onClick={() => { setDrawingTool("brush"); if (isAddingText) setIsAddingText(false); }}
      style={{ width: "45px", height: "45px", display: "flex", alignItems: "center", justifyContent: "center" }}
      title="Brush Tool - Draw freehand"
    >
      <MdBrush />
    </button>

    <button
      className={`btn ${drawingTool === "eraser" ? "btn-info text-dark" : "btn-outline-info"}`}
      onClick={() => { setDrawingTool("eraser"); if (isAddingText) setIsAddingText(false); }}
      style={{ width: "45px", height: "45px", display: "flex", alignItems: "center", justifyContent: "center" }}
      title="Eraser Tool - Remove drawings"
    >
      <MdClear />
    </button>

    <button
      className={`btn ${drawingTool === "rectangle" ? "btn-info text-dark" : "btn-outline-info"}`}
      onClick={() => { setDrawingTool("rectangle"); if (isAddingText) setIsAddingText(false); }}
      style={{ width: "45px", height: "45px", display: "flex", alignItems: "center", justifyContent: "center" }}
      title="Rectangle Tool - Draw rectangles"
    >
      <MdRectangle />
    </button>

    <button
      className={`btn ${drawingTool === "circle" ? "btn-info text-dark" : "btn-outline-info"}`}
      onClick={() => { setDrawingTool("circle"); if (isAddingText) setIsAddingText(false); }}
      style={{ width: "45px", height: "45px", display: "flex", alignItems: "center", justifyContent: "center" }}
      title="Circle Tool - Draw circles"
    >
      <MdCircle />
    </button>
  </div>

  {/* Second Row */}
  <div style={{ display: 'flex' }} className="gap-2">
    <button
      className={`btn ${drawingTool === "arrow" ? "btn-info text-dark" : "btn-outline-info"}`}
      onClick={() => { setDrawingTool("arrow"); if (isAddingText) setIsAddingText(false); }}
      style={{ width: "45px", height: "45px", display: "flex", alignItems: "center", justifyContent: "center" }}
      title="Arrow Tool - Draw arrows"
    >
      <MdArrowForward />
    </button>

    <button
      className={`btn ${drawingTool === "text" ? "btn-info text-dark" : "btn-outline-info"}`}
      onClick={() => {
        if (isAddingText) {
          setIsAddingText(false);
          setDrawingTool("brush");
        } else {
          setIsAddingText(true);
          setDrawingTool("text");
        }
      }}
      style={{ width: "45px", height: "45px", display: "flex", alignItems: "center", justifyContent: "center" }}
      title="Text Tool - Add text"
    >
      <TfiText />
    </button>

    <button
      className={`btn ${drawingTool === "pan" ? "btn-info text-dark" : "btn-outline-info"}`}
      onClick={() => { setDrawingTool("pan"); if (isAddingText) setIsAddingText(false); }}
      style={{ width: "45px", height: "45px", display: "flex", alignItems: "center", justifyContent: "center" }}
      title="Pan Tool - Drag to move"
    >
      <Hand />
    </button>
  </div>
</div>


                              {/* Brush Settings */}
                              <div className="mb-4">
                                <h6 className="text-black mb-3">
                                  {drawingTool === "eraser" ? "Eraser Settings" : "Brush Settings"}
                                </h6>

                                <div className="canvas-flex gap-3">
                                  {drawingTool !== "eraser" && (
                                    <div className="mb-3">
                                      <label className="form-label text-black small">Color</label>
                                      <div className="d-flex align-items-center gap-2">
                                        <input
                                          type="color"
                                          value={brushColor}
                                          onChange={(e) => setBrushColor(e.target.value)}
                                          className="form-control border form-control-color"
                                          style={{ width: '50px', height: '40px' }}
                                        />
                                      </div>
                                    </div>
                                  )}

                                  <div className="mb-3">
                                    <label className="form-label text-black small">
                                      Size: {drawingTool === "eraser" ? eraserRadius : brushRadius}px
                                    </label>
                                    <input
                                      type="range"
                                      min="1"
                                      max={drawingTool === "eraser" ? "50" : "20"}
                                      value={drawingTool === "eraser" ? eraserRadius : brushRadius}
                                      onChange={(e) =>
                                        drawingTool === "eraser"
                                          ? setEraserRadius(Number(e.target.value))
                                          : setBrushRadius(Number(e.target.value))
                                      }
                                      className="form-range"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Text Settings */}
                              {isAddingText && (
                                <div className="mb-4">
                                  <h6 className="text-black mb-3 d-flex align-items-center gap-2">
                                    <MdPinEnd className="text-warning" /> Text Settings
                                  </h6>

                                  <div className="canvas-flex gap-3">
                                    <div className="mb-3">
                                      <label className="form-label text-black small">Text Color</label>
                                      <input
                                        type="color"
                                        value={textSettings.color}
                                        onChange={(e) =>
                                          setTextSettings((prev) => ({ ...prev, color: e.target.value }))
                                        }
                                        className="form-control border form-control-color w-100"
                                        style={{ height: '40px' }}
                                      />
                                    </div>

                                    <div className="mb-3">
                                      <label className="form-label text-black small">Font Size: {textSettings.fontSize}px</label>
                                      <input
                                        type="range"
                                        min="12"
                                        max="48"
                                        value={textSettings.fontSize}
                                        onChange={(e) =>
                                          setTextSettings((prev) => ({
                                            ...prev,
                                            fontSize: Number.parseInt(e.target.value),
                                          }))
                                        }
                                        className="form-range"
                                      />
                                    </div>
                                  </div>

                                  <div className="mb-3">
                                    <label className="form-label text-black small">Font Family</label>
                                    <select
                                      value={textSettings.fontFamily}
                                      onChange={(e) =>
                                        setTextSettings((prev) => ({ ...prev, fontFamily: e.target.value }))
                                      }
                                      className="form-select form-select-sm text-black border-secondary"
                                    >
                                      <option value="Arial">Arial</option>
                                      <option value="Helvetica">Helvetica</option>
                                      <option value="Times New Roman">Times New Roman</option>
                                      <option value="Courier New">Courier New</option>
                                    </select>
                                  </div>
                                </div>
                              )}

                              {/* Zoom Controls */}
                              <div className="mb-4">
                                <h6 className="text-black mb-3 d-flex align-items-center gap-2">
                                  <MdZoomIn className="text-primary" /> Zoom Controls
                                </h6>
                                <div className="d-flex align-items-center gap-2">
                                  <button
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={() => handleZoom(100)}
                                    title="Zoom In"
                                  >
                                    <MdZoomIn size={20} />
                                  </button>
                                  <span className="badge bg-light text-dark">{Math.round(zoomLevel * 100)}%</span>
                                  <button
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={() => handleZoom(-100)}
                                    title="Zoom Out"
                                  >
                                    <MdZoomOut size={20} />
                                  </button>
                                  <button
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={resetZoom}
                                    title="Reset to 100%"
                                  >
                                    <MdUndo size={20} />
                                  </button>
                                  <button
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={handleFitToScreen}
                                    title="Fit to Screen"
                                  >
                                    <MdCenterFocusWeak size={20} />
                                  </button>
                                </div>
                                <p className="text-black small mt-2">
                                  Tip: Hold Ctrl + Click and drag to pan the image
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Canvas Area - Right Side on Desktop, Bottom on Mobile */}
                          <div className="canvas-area flex-grow-1 bg-light position-relative order-0 order-lg-1">
                            <div
                              className={`canvas-wrapper position-relative overflow-hidden h-100 align-items-center justify-content-center ${isDraggingOver ? "drag-over" : ""}`}
                              onClick={handleCanvasWrapperClick}
                              onWheel={handleWheel}
                              onMouseDown={handleMouseDown}
                              onMouseMove={handleMouseMove}
                              onMouseUp={handleMouseUp}
                              onDragEnter={handleDragEnter}
                              onDragOver={handleDragOver}
                              onDragLeave={handleDragLeave}
                              onDrop={handleDrop}
                              ref={containerRef}
                              style={{ display: "flex" }}
                            >
                              {isAnnotating ? (
                                <div
                                  className="canvas-container position-relative"
                                  style={{
                                    position: 'absolute',
                                    left: `${panOffset.x}px`,
                                    top: `${panOffset.y}px`,
                                    width: `${originalWidth * zoomLevel}px`,
                                    height: `${originalHeight * zoomLevel}px`,
                                    cursor: isPanning ? "grabbing" : (drawingTool === "pan" ? "grab" : (isAddingText ? "crosshair" : (drawingTool === "eraser" ? getEraserCursor() : "default"))),
                                  }}
                                >
                                  <>
                                    {/* Drawing Canvas */}
                                    <CanvasDraw
                                      ref={canvasRef}
                                      imgSrc={selectedImage?.content}
                                      canvasWidth={originalWidth * zoomLevel}
                                      canvasHeight={originalHeight * zoomLevel}
                                      loadTimeOffset={10}
                                      brushRadius={drawingTool === "eraser" ? eraserRadius : brushRadius}
                                      brushColor={drawingTool === "eraser" ? "#FFFFFF" : brushColor}
                                      lazyRadius={0}
                                      className="shadow rounded"
                                      disabled={drawingTool !== "brush"}
                                    />

                                    {/* Shape Canvas */}
                                    <canvas
                                      ref={shapeCanvasRef}
                                      width={originalWidth * zoomLevel}
                                      height={originalHeight * zoomLevel}
                                      className="position-absolute top-0 start-0 shadow rounded"
                                      style={{
                                        pointerEvents: ["rectangle", "circle", "arrow", "line", "eraser"].includes(drawingTool)
                                          ? "auto" : "none",
                                        zIndex: 5,
                                        cursor: drawingTool === "eraser" ? getEraserCursor() : "default",
                                      }}
                                      onMouseDown={handleShapeMouseDown}
                                      onMouseMove={handleShapeMouseMove}
                                      onMouseUp={handleShapeMouseUp}
                                    />

                                    {/* Text Overlay Canvas */}
                                    <canvas
                                      ref={textCanvasRef}
                                      width={originalWidth * zoomLevel}
                                      height={originalHeight * zoomLevel}
                                      className="position-absolute top-0 start-0"
                                      style={{
                                        pointerEvents: isAddingText ? "auto" : "none",
                                        zIndex: 10,
                                        cursor: isAddingText ? "crosshair" : "default",
                                      }}
                                      onClick={handleCanvasClick}
                                    />

                                    {/* Interactive Text Elements */}
                                    {textElements.map((element) => (
                                      <div
                                        key={element.id}
                                        className={`text-element position-absolute user-select-none ${selectedTextId === element.id ? 'selected' : ''}`}
                                        style={{
                                          left: element.x * zoomLevel,
                                          top: element.y * zoomLevel,
                                          fontSize: `${element.fontSize * zoomLevel}px`,
                                          fontFamily: element.fontFamily,
                                          fontWeight: element.fontWeight,
                                          fontStyle: element.fontStyle,
                                          textDecoration: element.textDecoration,
                                          color: element.color,
                                          backgroundColor: element.backgroundColor,
                                          padding: `${element.padding * zoomLevel}px`,
                                          cursor: isDragging ? "grabbing" : "grab",
                                          zIndex: element.zIndex + 10,
                                          transform: `rotate(${element.rotation || 0}deg)`,
                                          textAlign: element.textAlign,
                                          border: selectedTextId === element.id
                                            ? "2px dashed #0d6efd"
                                            : "1px solid transparent",
                                          borderRadius: "6px",
                                          minWidth: "20px",
                                          minHeight: `${element.fontSize * zoomLevel}px`,
                                          boxShadow: selectedTextId === element.id
                                            ? "0 0 0 0.25rem rgba(13, 110, 253, 0.25)"
                                            : "0 0.25rem 0.5rem rgba(0,0,0,0.1)",
                                          transition: "all 0.2s ease-in-out",
                                          whiteSpace: "nowrap",
                                          overflow: "visible",
                                        }}
                                        onMouseDown={(e) => handleTextMouseDown(e, element.id)}
                                        onDoubleClick={() => handleTextDoubleClick(element.id)}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedTextId(element.id);
                                        }}
                                      >
                                        {element.text}
                                        {selectedTextId === element.id && (
                                          <div className="position-absolute top-0 end-0">
                                            <div className="btn-group-vertical btn-group-sm shadow"
                                              style={{ transform: 'translate(50%, -50%)' }}>
                                              <button
                                                className="btn btn-primary btn-sm"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleTextDoubleClick(element.id);
                                                }}
                                                title="Edit text"
                                              >
                                                ✏️
                                              </button>
                                              <button
                                                className="btn btn-danger btn-sm"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  deleteTextElement(element.id);
                                                }}
                                                title="Delete text"
                                              >
                                                🗑️
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ))}

                                    {/* Text Input Field */}
                                    {textPosition && (
                                      <div
                                        className="position-absolute"
                                        style={{
                                          top: textPosition.y * zoomLevel,
                                          left: textPosition.x * zoomLevel,
                                          zIndex: 20,
                                        }}
                                      >
                                        <div className="input-group shadow-lg">
                                          <input
                                            type="text"
                                            autoFocus
                                            value={textInput}
                                            onChange={(e) => setTextInput(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter" && textInput.trim()) {
                                                addTextElement(textPosition.x, textPosition.y, textInput);
                                              } else if (e.key === "Escape") {
                                                setTextInput("");
                                                setTextPosition(null);
                                                setIsAddingText(false);
                                              }
                                            }}
                                            onBlur={() => {
                                              if (textInput.trim()) {
                                                addTextElement(textPosition.x, textPosition.y, textInput);
                                              } else {
                                                setTextPosition(null);
                                                setIsAddingText(false);
                                              }
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="form-control border-primary"
                                            style={{
                                              fontSize: `${textSettings.fontSize * zoomLevel}px`,
                                              fontFamily: textSettings.fontFamily,
                                              fontWeight: textSettings.fontWeight,
                                              fontStyle: textSettings.fontStyle,
                                              color: textSettings.color,
                                              backgroundColor: textSettings.backgroundColor,
                                              minWidth: "250px",
                                              borderWidth: '2px'
                                            }}
                                            placeholder="Type your text and press Enter..."
                                          />
                                          <span className="input-group-text bg-primary text-white">
                                            ⌨️
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                </div>
                              ) : (
                                <img
                                  src={selectedImage?.content || "/placeholder.svg"}
                                  alt={selectedImage?.name}
                                  className="shadow rounded"
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "contain",
                                  }}
                                />
                              )}
                            </div>

                            {/* Floating Status Bar */}
                            {isAnnotating && (
                              <div className="position-absolute bottom-0 end-0 m-3">
                                <div className="badge bg-dark text-light px-3 py-2 shadow">
                                  Tool: <span className="text-info fw-bold">{drawingTool}</span>
                                  {drawingTool !== "eraser" && (
                                    <>
                                      | Color: <span style={{ color: brushColor }}>●</span>
                                      | Size: {brushRadius}px
                                    </>
                                  )}
                                  {drawingTool === "eraser" && (
                                    <> | Size: {eraserRadius}px</>
                                  )}
                                  | Zoom: {Math.round(zoomLevel * 100)}%
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Text Editing Modal */}
                          {isEditingText && (
  <div
    className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-75"
    style={{ zIndex: 9999 }}
  >
    <div
      className="bg-white rounded-3 shadow-lg p-4 mx-3"
      style={{ minWidth: "350px", maxWidth: "90vw" }}
    >
      <div className="d-flex align-items-center gap-2 mb-3">
        <div className="bg-primary text-white rounded-circle p-2">
          <MdPinEnd />
        </div>
        <h5 className="mb-0 text-primary fw-bold">Edit Text</h5>
      </div>
      {/* Text Content Input */}
      <div className="mb-3">
        <label className="form-label text-black small">Text Content</label>
        <input
          ref={editTextInputRef}
          type="text"
          value={editingTextValue}
          onChange={(e) => setEditingTextValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && editingTextValue.trim()) {
              saveTextEdit();
            } else if (e.key === "Escape") {
              cancelTextEdit();
            }
          }}
          className="form-control form-control-lg border-primary"
          placeholder="Enter your text..."
          style={{
            fontSize: `${textSettings.fontSize}px`,
            fontFamily: textSettings.fontFamily,
            fontWeight: textSettings.fontWeight,
            fontStyle: textSettings.fontStyle,
            color: textSettings.color,
          }}
        />
      </div>
      {/* Text Settings Section */}
      <div className="mb-3">
        <h6 className="text-black mb-3 d-flex align-items-center gap-2">
          <MdPinEnd className="text-warning" /> Text Settings
        </h6>
        <div className="d-flex flex-column gap-3">
          <div>
            <label className="form-label text-black small">Text Color</label>
            <input
              type="color"
              value={textSettings.color}
              onChange={(e) =>
                setTextSettings((prev) => ({ ...prev, color: e.target.value }))
              }
              className="form-control border form-control-color w-100"
              style={{ height: "40px" }}
            />
          </div>
          <div>
            <label className="form-label text-black small">
              Font Size: {textSettings.fontSize}px
            </label>
            <input
              type="range"
              min="12"
              max="48"
              value={textSettings.fontSize}
              onChange={(e) =>
                setTextSettings((prev) => ({
                  ...prev,
                  fontSize: Number.parseInt(e.target.value),
                }))
              }
              className="form-range"
            />
          </div>
          <div>
            <label className="form-label text-black small">Font Family</label>
            <select
              value={textSettings.fontFamily}
              onChange={(e) =>
                setTextSettings((prev) => ({ ...prev, fontFamily: e.target.value }))
              }
              className="form-select form-select-sm text-black border-secondary"
            >
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Courier New">Courier New</option>
            </select>
          </div>
        </div>
      </div>
      <div className="d-flex gap-2 justify-content-end">
        <button
          className="btn btn-success px-4"
          onClick={saveTextEdit}
          disabled={!editingTextValue.trim()}
        >
          <MdPinEnd className="me-1" /> Save
        </button>
        <button className="btn btn-outline-secondary px-4" onClick={cancelTextEdit}>
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
                        </div>
                      )}
                    </Modal.Body>
                  </Modal>

                  {/* Enhanced Reply Bar - WhatsApp style */}
                  {replyingTo && (
                    <div className="chatn-reply-bar">
                      <div className="chatn-reply-info">
                        <div className="chatn-reply-header">
                          <MdReply className="chatn-reply-icon" />
                          <span className="chatn-reply-label">Replying to {replyingTo.senderName}</span>
                        </div>
                        <div className="chatn-reply-preview">{replyingTo.file ? "📷 Image" : replyingTo.text}</div>
                        <div className="chatn-reply-original-time">
                          {new Date(replyingTo.originalTimestamp).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                      <button className="chatn-reply-cancel" onClick={cancelReply}>
                        <MdClose size={18} />
                      </button>
                    </div>
                  )}

                  <form className="chatn-input-wrapper" onSubmit={handleSubmit}>
                    {!isChatEnded && (
                      <VoiceRecorder
                        socket={socket}
                        currentRoomId={currentRoomId}
                        userData={userData}
                        replyingTo={replyingTo}
                        cancelReply={cancelReply}
                        getSenderInfo={getSenderInfo}
                      />
                    )
                    }
                    <input
                      type="file"
                      id="chatnFileUpload"
                      onChange={handleFileChange}
                      style={{ display: "none" }}
                      disabled={isChatEnded || chatData?.PaymentStatus?.toLowerCase() !== "paid"}
                      accept="image/*"
                    />
                    <label
                      htmlFor="chatnFileUpload"
                      className={`chatn-attachment-button ${isChatEnded || chatData?.PaymentStatus?.toLowerCase() !== "paid" ? "disabled" : ""
                        }`}
                    >
                      <MdAttachment />
                    </label>
                    <input
                      type="text"
                      className="chatn-text-input"
                      placeholder={replyingTo ? `Reply to ${replyingTo.senderName}...` : "Type your message..."}
                      value={message}
                      disabled={isChatEnded || chatData?.PaymentStatus?.toLowerCase() !== "paid"}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="chatn-send-button"
                      disabled={isChatEnded || chatData?.PaymentStatus?.toLowerCase() !== "paid" || !message.trim()}
                    >
                      <MdSend />
                    </button>
                  </form>
                </>
              ) : (
                <div className="empty-chat-container">
                  <div className="empty-chat-content">
                    <div className="empty-chat-icon">
                      <svg width="120" height="120" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 13.4876 3.36093 14.891 4 16.1272V21L8.87279 20C9.94066 20.6336 10.9393 21 12 21Z"
                          stroke="#6B7280"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <h3>Group Messages</h3>
                    <p>Select a group chat to start the conversation</p>
                    {isMobileView && (
                      <button className="btn btn-primary mt-3" onClick={handleBackToList}>
                        View Group Chats
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ManualChat