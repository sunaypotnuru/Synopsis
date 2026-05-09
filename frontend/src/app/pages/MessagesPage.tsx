import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Send, Paperclip, Search, ArrowLeft, Plus, X,
  Check, CheckCheck, Smile, Reply, FileText,
  Download, Loader2, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuthStore } from "../../lib/store";
import api, { messagesAPI } from "../../lib/api";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { useTranslation } from "../../lib/i18n";

interface Conversation {
  partner_id: string;
  partner_name: string;
  partner_avatar: string | null;
  last_message: { content: string } | null;
  unread_count: number;
  partner_role?: string;
  is_online?: boolean;
}

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  attachment_url: string | null;
  attachment_type?: string;
  read: boolean;
  created_at: string;
  reply_to?: { id: string; content: string; sender_id: string } | null;
}

const EMOJI_SET = ["😊", "😂", "❤️", "👍", "🙏", "😢", "🔥", "✅", "🎉", "😅",
  "💪", "🤔", "😷", "💊", "🏥", "👨‍⚕️", "🩺", "💉", "🩸", "🌟"];

export default function MessagesPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewMessageDialog, setShowNewMessageDialog] = useState(false);
  interface Contact {
    id: string;
    full_name?: string;
    name?: string;
    avatar_url?: string;
    role?: string;
    specialization?: string;
  }

  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [hoveredMsg, setHoveredMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdminConversation, setIsAdminConversation] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevMsgCountRef = useRef(0);

  useEffect(() => {
    loadConversations();
    if (!user?.id) return;

    const room = supabase.channel("online-users", { config: { presence: { key: user.id } } });
    room
      .on("presence", { event: "sync" }, () => {
        const state = room.presenceState();
        setOnlineUsers(new Set(Object.keys(state)));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await room.track({ online_at: new Date().toISOString() });
      });

    return () => { supabase.removeChannel(room); };
  }, [user?.id]);

  useEffect(() => {
    if (!selectedConversation || !user?.id) return;

    // Verify admin conversation status from backend data
    const conv = conversations.find(c => c.partner_id === selectedConversation.partner_id);
    setIsAdminConversation(conv?.partner_role === "admin");

    loadMessages(selectedConversation.partner_id);

    // Realtime subscription for new messages
    const channel = supabase.channel(`messages:${user.id}:${selectedConversation.partner_id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        loadMessages(selectedConversation.partner_id, true);
      })
      .subscribe();

    // Typing indicator channel
    const typingChannel = supabase.channel(`typing:${selectedConversation.partner_id}:${user.id}`)
      .on("broadcast", { event: "typing" }, ({ payload }: { payload: { userId: string } }) => {
        if (payload.userId !== user.id) {
          setPartnerTyping(true);
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setPartnerTyping(false), 3000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(typingChannel);
      setPartnerTyping(false);
    };
  }, [selectedConversation, user?.id]);

  useEffect(() => {
    // Only auto-scroll if message count strictly increased (new message sent or received)
    if (messages.length > prevMsgCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMsgCountRef.current = messages.length;
  }, [messages.length]);

  const loadConversations = async () => {
    try {
      const response = await messagesAPI.getConversations();
      setConversations(response.data);
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (partnerId: string, silent = false) => {
    try {
      const response = await messagesAPI.getMessages(partnerId);
      setMessages(response.data);
      // Mark received messages as read
      if (response.data?.length > 0 && typeof messagesAPI.markRead === 'function') {
        messagesAPI.markRead(partnerId).catch(() => { });
      }
    } catch (_error) {
      if (!silent) console.error("Error loading messages:", _error);
    }
  };

  const broadcastTyping = useCallback(() => {
    if (!selectedConversation || !user?.id) return;
    supabase.channel(`typing:${user.id}:${selectedConversation.partner_id}`)
      .send({ type: "broadcast", event: "typing", payload: { userId: user.id } });
  }, [selectedConversation, user?.id]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    broadcastTyping();
    // Auto-resize
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const sendMessage = async (overrideText?: string) => {
    const text = overrideText || newMessage.trim();
    if (!text || !selectedConversation) return;

    try {
      setSending(true);
      await messagesAPI.sendMessage({
        recipient_id: selectedConversation.partner_id,
        content: text,
        ...(replyTo ? { reply_to_id: replyTo.id } : {}),
      });
      setNewMessage("");
      setReplyTo(null);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      await loadMessages(selectedConversation.partner_id, true);
      await loadConversations();
    } catch {
      toast.error(t('patient.messages.send_failed', "Failed to send message"));
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) { toast.error(t('patient.messages.file_too_large', "File too large (max 10MB)")); return; }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const _path = `messages/${user?.id}/${Date.now()}.${ext}`;
      const { data: uploadData } = await messagesAPI.uploadAttachment(file);
      const publicUrl = uploadData.url;
      const isImage = file.type.startsWith("image/");

      await messagesAPI.sendMessage({
        recipient_id: selectedConversation.partner_id,
        content: isImage ? `[IMAGE_ATTACHMENT]${file.name}||${publicUrl}` : `[FILE_ATTACHMENT]📎 ${file.name}||${publicUrl}`,
      });
      await loadMessages(selectedConversation.partner_id);
      toast.success(t('patient.messages.file_sent', "File sent!"));
    } catch (err) {
      let errorMsg = t('patient.messages.upload_failed', "Upload failed");
      if (err instanceof Error) {
        const errMsg = err.message.toLowerCase();
        if (errMsg.includes("size") || errMsg.includes("large")) {
          errorMsg = t('patient.messages.file_too_large', "File too large (max 10MB)");
        } else if (errMsg.includes("type") || errMsg.includes("format") || errMsg.includes("unsupported")) {
          errorMsg = t('patient.messages.unsupported_type', "Unsupported file type");
        } else if (errMsg.includes("network") || errMsg.includes("connection") || errMsg.includes("timeout")) {
          errorMsg = t('patient.messages.network_error', "Network error. Please check your connection.");
        } else {
          errorMsg = `${errorMsg}: ${err.message}`;
        }
      }
      toast.error(errorMsg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const loadAvailableContacts = async () => {
    setLoadingContacts(true);
    try {
      let endpoint = "";
      if (user?.role === "patient") {
        endpoint = "/api/v1/doctors";
      } else if (user?.role === "doctor") {
        endpoint = "/api/v1/doctor/patients";
      } else if (user?.role === "admin") {
        endpoint = "/api/v1/admin/users"; // Fetching all platform users
      } else {
        return; // Unknown role
      }
      const response = await api.get(endpoint);
      setAvailableContacts(response.data || []);
    } catch {
      toast.error(t('patient.messages.load_contacts_failed', "Failed to load contacts"));
    } finally {
      setLoadingContacts(false);
    }
  };

  const startNewConversation = (contact: Contact) => {
    setSelectedConversation({
      partner_id: contact.id,
      partner_name: String(contact.full_name || contact.name || user?.user_metadata?.full_name || t('common.unknown', "Unknown")),
      partner_avatar: contact.avatar_url || null,
      partner_role: contact.role || "unknown",
      last_message: null,
      unread_count: 0,
    });
    setShowNewMessageDialog(false);
    setMessages([]);
  };

  const filteredConversations = conversations.filter(c =>
    c.partner_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center bg-gradient-to-br from-[#F0FDFA] via-white to-[#F8FAFC]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#0D9488] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#64748B]">{t('patient.messages.loading_messages', "Loading messages...")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-6">
      <div className="max-w-7xl mx-auto h-[750px] flex flex-col bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Image lightbox */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightboxUrl(null)}
          >
            <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setLightboxUrl(null)}>
              <X className="w-8 h-8" />
            </button>
            <img src={lightboxUrl} alt="Preview" className="max-w-full max-h-full object-contain rounded-xl" onClick={e => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col h-full">
        <div className="px-6 py-4 border-b bg-white flex justify-between items-center shrink-0">
          <div>
            <h1 className="text-xl font-bold text-[#0F172A]">{t('patient.messages.title', "Platform Messages")}</h1>
            <p className="text-xs text-[#64748B]">
              {user?.role === "admin"
                ? t('admin.messages.desc', "Oversee and communicate securely with all platform users.")
                : t('patient.messages.desc', "Communicate securely across the NetraAI network.")}
            </p>
          </div>
        </div>
        <div className="flex-1 flex min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 w-full h-full">

          <div className="flex flex-col border-r border-gray-100 h-full overflow-hidden bg-gray-50/30">
            <div className="p-4 space-y-3 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={t('patient.messages.search_placeholder', "Search...")}
                  className="pl-9 h-10 text-sm bg-white border-gray-200 rounded-xl"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <Button
                onClick={() => { setShowNewMessageDialog(true); loadAvailableContacts(); }}
                className="w-full h-10 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-xl shadow-sm transition-all"
              >
                <Plus className="w-4 h-4 mr-2" /> {t('patient.messages.new_message', "New Message")}
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-10 text-[#64748B]">
                  <p className="text-sm">{t('patient.messages.no_conversations', "No conversations yet")}</p>
                </div>
              ) : filteredConversations.map((conv) => (
                <button
                  key={conv.partner_id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-4 rounded-2xl text-left transition-all ${selectedConversation?.partner_id === conv.partner_id
                    ? "bg-white shadow-sm border border-gray-200 ring-1 ring-black/5"
                    : "hover:bg-white/50 border border-transparent"}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <Avatar className="w-11 h-11 border-2 border-white shadow-sm">
                        {conv.partner_avatar && <AvatarImage src={conv.partner_avatar} />}
                        <AvatarFallback className="bg-gradient-to-br from-[#0D9488] to-[#0F766E] text-white text-sm">
                          {conv.partner_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {onlineUsers.has(conv.partner_id) && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="font-bold text-sm text-[#0F172A] truncate">{conv.partner_name}</p>
                        {conv.unread_count > 0 && (
                          <span className="bg-[#0D9488] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{conv.unread_count}</span>
                        )}
                      </div>
                      {conv.last_message && (
                        <p className="text-xs text-[#64748B] truncate leading-relaxed">{conv.last_message.content}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col h-full bg-white overflow-hidden">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 bg-white shrink-0">
                  <button onClick={() => setSelectedConversation(null)} className="lg:hidden">
                    <ArrowLeft className="w-5 h-5 text-gray-500" />
                  </button>
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      {selectedConversation.partner_avatar && <AvatarImage src={selectedConversation.partner_avatar} />}
                      <AvatarFallback className="bg-gradient-to-br from-[#0D9488] to-[#0F766E] text-white">
                        {selectedConversation.partner_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {onlineUsers.has(selectedConversation.partner_id) && (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-[#0F172A] text-sm">{selectedConversation.partner_name}</p>
                    <p className="text-xs text-[#64748B]">
                      {partnerTyping ? (
                        <span className="text-[#0D9488] animate-pulse">{t('patient.messages.typing', "typing...")}</span>
                      ) : onlineUsers.has(selectedConversation.partner_id) ? t('common.online', "Online") : t('common.offline', "Offline")}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                  {messages.map((rawMsg) => {
                    const msg = { ...rawMsg };
                    if (msg.content?.startsWith("[IMAGE_ATTACHMENT]")) {
                      const extracted = msg.content.substring(18);
                      if (extracted.includes("||")) {
                        const parts = extracted.split("||");
                        msg.content = parts[0];
                        msg.attachment_url = parts[1];
                      } else {
                        msg.attachment_url = extracted;
                        msg.content = "📷 " + t('patient.messages.image', "Image");
                      }
                      msg.attachment_type = "image";
                    } else if (msg.content?.startsWith("[FILE_ATTACHMENT]")) {
                      const parts = msg.content.substring(17).split("||");
                      msg.content = parts[0];
                      msg.attachment_url = parts[1];
                      msg.attachment_type = "file";
                    }

                    const isOwn = msg.sender_id === user?.id;
                    const isImg = msg.attachment_type === "image" && Boolean(msg.attachment_url);
                    const isFile = msg.attachment_type === "file" && Boolean(msg.attachment_url);

                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"} group`}
                        onMouseEnter={() => setHoveredMsg(msg.id)}
                        onMouseLeave={() => setHoveredMsg(null)}
                      >
                        <div className="relative max-w-[70%]">
                          {/* Reply-to quote */}
                          {msg.reply_to && (
                            <div className={`px-3 py-1.5 mb-1 rounded-lg text-xs border-l-2 border-[#0D9488] bg-gray-50 text-gray-500 truncate`}>
                              <span className="font-medium">{msg.reply_to.sender_id === user?.id ? t('common.you', "You") : selectedConversation.partner_name}:</span>{" "}
                              {msg.reply_to.content}
                            </div>
                          )}

                          <div className={`rounded-2xl px-4 py-2.5 shadow-sm ${isOwn
                            ? "bg-gradient-to-br from-[#0D9488] to-[#0F766E] text-white rounded-tr-sm"
                            : "bg-white border border-gray-100 text-[#0F172A] rounded-tl-sm"}`}
                          >
                            {isImg ? (
                              <div className="relative group/dl inline-block">
                                <img
                                  src={msg.attachment_url!}
                                  alt="attachment"
                                  className="max-w-[200px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => setLightboxUrl(msg.attachment_url!)}
                                />
                                <a
                                  href={`${msg.attachment_url}?download=${encodeURIComponent(msg.content === "📷 " + t('patient.messages.image', "Image") ? "image.png" : msg.content)}`}
                                  download={msg.content === "📷 " + t('patient.messages.image', "Image") ? "image.png" : msg.content}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-lg opacity-0 group-hover/dl:opacity-100 transition-opacity backdrop-blur-sm shadow-sm"
                                  onClick={(e) => e.stopPropagation()}
                                  title={t('common.download_image', "Download Image")}
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              </div>
                            ) : isFile ? (
                              <a
                                href={`${msg.attachment_url}?download=${encodeURIComponent(msg.content.replace("📎 ", ""))}`}
                                download={msg.content.replace("📎 ", "")}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 hover:opacity-80 group/filedl"
                                title={t('common.download_file', "Download File")}
                              >
                                <FileText className="w-5 h-5 shrink-0" />
                                <span className="text-sm break-all">{msg.content.replace("📎 ", "")}</span>
                                <Download className="w-4 h-4 shrink-0 text-gray-400 group-hover/filedl:text-gray-600 transition-colors" />
                              </a>
                            ) : (
                              <p className="text-sm break-words whitespace-pre-wrap">{msg.content}</p>
                            )}

                            <div className={`flex items-center justify-end gap-1 mt-1 ${isOwn ? "text-white/60" : "text-gray-400"}`}>
                              <span className="text-[10px]">
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                              {isOwn && (
                                msg.read
                                  ? <CheckCheck className="w-3 h-3 text-blue-300" />
                                  : <Check className="w-3 h-3" />
                              )}
                            </div>
                          </div>

                          {/* Hover reply button */}
                          <AnimatePresence>
                            {hoveredMsg === msg.id && (
                              <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                onClick={() => { setReplyTo(msg); textareaRef.current?.focus(); }}
                                className={`absolute top-0 ${isOwn ? "left-0 -translate-x-full pr-2" : "right-0 translate-x-full pl-2"} flex items-center`}
                                title={t('common.reply', "Reply")}
                              >
                                <div className="p-1.5 bg-white rounded-full shadow-md border border-gray-100 text-gray-500 hover:text-[#0D9488] transition-colors">
                                  <Reply className="w-3.5 h-3.5" />
                                </div>
                              </motion.button>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing bubble */}
                  {partnerTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm flex items-center gap-1">
                        {[0, 0.15, 0.3].map((delay, i) => (
                          <motion.div
                            key={i}
                            className="w-2 h-2 bg-gray-400 rounded-full"
                            animate={{ y: [0, -4, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply preview */}
                <AnimatePresence>
                  {replyTo && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex items-center gap-2"
                    >
                      <div className="flex-1 border-l-2 border-[#0D9488] pl-2">
                        <p className="text-[10px] text-[#0D9488] font-medium">
                          {replyTo.sender_id === user?.id ? t('common.you', "You") : selectedConversation.partner_name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{replyTo.content}</p>
                      </div>
                      <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Emoji Picker */}
                <AnimatePresence>
                  {showEmojiPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="px-4 py-2 border-t border-gray-100 bg-white"
                    >
                      <div className="flex flex-wrap gap-1.5">
                        {EMOJI_SET.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => { setNewMessage(m => m + emoji); setShowEmojiPicker(false); textareaRef.current?.focus(); }}
                            className="text-xl hover:scale-125 transition-transform"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Input Bar */}
                {isAdminConversation && user?.role !== "admin" ? (
                  <div className="p-6 border-t border-gray-100 bg-gray-50 text-center text-sm text-gray-500 italic shrink-0">
                    {t('patient.messages.admin_readonly', "This is an administrative announcement. Replies are disabled.")}
                  </div>
                ) : (
                  <div className="p-4 border-t border-gray-100 bg-white shrink-0">
                    <div className="flex items-end gap-2">
                      {/* Hidden file input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-[#64748B] hover:text-[#0D9488] shrink-0"
                        title="Attach file"
                      >
                        {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => setShowEmojiPicker(v => !v)}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-[#64748B] hover:text-yellow-500 shrink-0"
                        title="Emoji"
                      >
                        <Smile className="w-5 h-5" />
                      </button>
                      <textarea
                        ref={textareaRef}
                        value={newMessage}
                        onChange={handleTextareaChange}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                        }}
                        placeholder={t('patient.messages.type_message', "Type a message...")}
                        rows={1}
                        className="flex-1 resize-none px-3 py-2.5 rounded-xl border border-gray-200 focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 outline-none text-sm bg-gray-50 transition-all overflow-hidden"
                        style={{ minHeight: "42px", maxHeight: "120px" }}
                      />
                      <Button
                        onClick={() => sendMessage()}
                        disabled={!newMessage.trim() || sending}
                        className="bg-gradient-to-r from-[#0D9488] to-[#0F766E] hover:from-[#0F766E] hover:to-[#065F46] h-10 w-10 p-0 rounded-xl shrink-0"
                      >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 ml-1">{t('patient.messages.enter_to_send', "Enter to send · Shift+Enter for new line")}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-4 sm:p-12 bg-gray-50/30">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="max-w-md w-full text-center p-10 rounded-3xl bg-white/40 backdrop-blur-md border border-white/60 shadow-xl shadow-gray-200/50"
                >
                  <div className="w-20 h-20 bg-gradient-to-br from-[#0D9488]/10 to-[#0F766E]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <MessageSquare className="w-10 h-10 text-[#0D9488]" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#0F172A] mb-3">{t('patient.messages.select_conversation', "Select a conversation")}</h3>
                  <p className="text-[#64748B] text-base leading-relaxed">
                    {t('patient.messages.choose_list', "Choose a patient or doctor from your list to start a clinical-grade encrypted conversation.")}
                  </p>
                  <div className="mt-8 pt-8 border-t border-gray-100">
                    <div className="flex items-center justify-center gap-4 text-xs text-[#94A3B8] font-medium uppercase tracking-widest">
                      <div className="flex items-center gap-1"><CheckCheck className="w-3.5 h-3.5 text-[#0D9488]" /> {t('common.encrypted', "Encrypted")}</div>
                      <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                      <div className="flex items-center gap-1"><CheckCheck className="w-3.5 h-3.5 text-[#0D9488]" /> {t('common.verified', "Verified")}</div>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

      {/* New Message Dialog */}
      <Dialog open={showNewMessageDialog} onOpenChange={setShowNewMessageDialog}>
        <DialogContent className="max-w-md" aria-describedby="new-message-desc">
          <DialogHeader><DialogTitle>{t('patient.messages.start_new_conversation', "Start New Conversation")}</DialogTitle></DialogHeader>
          <p id="new-message-desc" className="sr-only">{t('patient.messages.select_contact', "Select a contact")}</p>
          <div className="mt-4">
            {loadingContacts ? (
              <div className="text-center py-8">
                <div className="w-10 h-10 border-4 border-[#0D9488] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-[#64748B]">{t('patient.messages.loading_contacts', "Loading contacts...")}</p>
              </div>
            ) : availableContacts.length === 0 ? (
              <div className="text-center py-8 text-[#64748B]">
                <p className="text-sm">{t('patient.messages.no_contacts', "No contacts available")}</p>
                <p className="text-xs mt-1">{user?.role === "patient" ? t('patient.messages.book_appointment', "Book an appointment first") : t('doctor.messages.no_patients', "No patients found")}</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {availableContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => startNewConversation(contact)}
                    className="w-full p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-[#0D9488]/30 transition-all text-left flex items-center gap-3"
                  >
                    <Avatar className="w-10 h-10">
                      {contact.avatar_url && <AvatarImage src={contact.avatar_url} />}
                      <AvatarFallback className="bg-gradient-to-br from-[#0D9488] to-[#0F766E] text-white text-sm">
                        {(contact.full_name || contact.name || "?").charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm text-[#0F172A]">{contact.full_name || contact.name || t('common.unknown', "Unknown")}</p>
                      {contact.specialization && <p className="text-xs text-[#64748B]">{contact.specialization}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}
