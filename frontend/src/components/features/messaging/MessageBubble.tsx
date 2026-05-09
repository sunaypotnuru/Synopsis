import { useState } from "react";
import { Check, CheckCheck, Reply, Download, Image as ImageIcon } from "lucide-react";
import { motion } from "motion/react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  attachment_url?: string | null;
  attachment_type?: string;
  read: boolean;
  created_at: string;
  reply_to?: {
    id: string;
    content: string;
    sender_name: string;
  } | null;
  reactions?: {
    emoji: string;
    users: string[];
  }[];
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  senderName?: string;
  onReply?: (message: Message) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onImageClick?: (url: string) => void;
  showAvatar?: boolean;
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export default function MessageBubble({
  message,
  isOwn,
  senderName,
  onReply,
  onReact,
  onImageClick,
  showAvatar = true,
}: MessageBubbleProps) {
  const { t } = useTranslation();
  const [showReactions, setShowReactions] = useState(false);

  const handleReaction = (emoji: string) => {
    if (onReact) {
      onReact(message.id, emoji);
    }
    setShowReactions(false);
  };

  const isImage = message.attachment_type?.startsWith("image/");
  const isDocument = message.attachment_type && !isImage;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2 group ${isOwn ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      {showAvatar && !isOwn && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0D9488] to-[#0F766E] flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
          {senderName?.charAt(0) || "?"}
        </div>
      )}

      <div className={`flex flex-col max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
        {/* Sender Name (for group chats) */}
        {!isOwn && senderName && (
          <p className="text-xs text-gray-500 mb-1 px-1">{senderName}</p>
        )}

        {/* Message Container */}
        <div
          className="relative"
          onMouseEnter={() => setShowReactions(true)}
          onMouseLeave={() => setShowReactions(false)}
        >
          {/* Reply Preview */}
          {message.reply_to && (
            <div
              className={`mb-2 p-2 rounded-lg border-l-4 ${
                isOwn
                  ? "bg-white/20 border-white/40"
                  : "bg-gray-100 border-[#0D9488]"
              }`}
            >
              <p className="text-xs font-semibold opacity-80">
                {message.reply_to.sender_name}
              </p>
              <p className="text-xs opacity-70 truncate">{message.reply_to.content}</p>
            </div>
          )}

          {/* Message Bubble */}
          <div
            className={`rounded-2xl px-4 py-2 ${
              isOwn
                ? "bg-gradient-to-br from-[#0D9488] to-[#0F766E] text-white"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {/* Attachment */}
            {message.attachment_url && (
              <div className="mb-2">
                {isImage ? (
                  <button
                    onClick={() => onImageClick?.(message.attachment_url!)}
                    className="relative group/img"
                  >
                    <img
                      src={message.attachment_url}
                      alt="Attachment"
                      className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      style={{ maxHeight: "300px" }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 rounded-lg transition-colors flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ) : isDocument ? (
                  <a
                    href={message.attachment_url}
                    download
                    className={`flex items-center gap-2 p-2 rounded-lg ${
                      isOwn ? "bg-white/20" : "bg-white"
                    } hover:opacity-80 transition-opacity`}
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-sm">
                      {message.attachment_type?.split("/")[1]?.toUpperCase() || "Document"}
                    </span>
                  </a>
                ) : null}
              </div>
            )}

            {/* Message Content */}
            {message.content && (
              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
            )}

            {/* Timestamp & Read Status */}
            <div className="flex items-center gap-1 mt-1">
              <span
                className={`text-xs ${
                  isOwn ? "text-white/70" : "text-gray-500"
                }`}
              >
                {format(new Date(message.created_at), "HH:mm")}
              </span>
              {isOwn && (
                <span className="text-white/70">
                  {message.read ? (
                    <CheckCheck className="w-3 h-3 text-blue-300" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex gap-1 mt-1">
              {message.reactions.map((reaction, idx) => (
                <button
                  key={idx}
                  onClick={() => handleReaction(reaction.emoji)}
                  className="px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs flex items-center gap-1 hover:bg-gray-50 transition-colors shadow-sm"
                  title={`${reaction.users.length} reaction${reaction.users.length > 1 ? "s" : ""}`}
                >
                  <span>{reaction.emoji}</span>
                  <span className="text-gray-600">{reaction.users.length}</span>
                </button>
              ))}
            </div>
          )}

          {/* Quick Actions (on hover) */}
          {showReactions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`absolute ${
                isOwn ? "left-0" : "right-0"
              } top-0 -translate-y-full mb-1 bg-white rounded-lg shadow-lg border border-gray-200 p-1 flex gap-1 z-10`}
            >
              {/* Quick Reactions */}
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors text-lg"
                  title={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              ))}

              {/* Reply Button */}
              {onReply && (
                <button
                  onClick={() => onReply(message)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors ml-1 border-l border-gray-200"
                  title={t('components.message_bubble.reply_title_0', "Reply")}
                >
                  <Reply className="w-4 h-4 text-gray-600" />
                </button>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
