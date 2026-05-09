import { useState, useRef, KeyboardEvent } from "react";
import { Send, Paperclip, Smile, X, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import EmojiPicker from "@/components/features/messaging/EmojiPicker";
import { useTranslation } from "react-i18next";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onFileUpload: (file: File) => void;
  onVoiceRecord?: () => void;
  replyTo?: { id: string; content: string; sender_name: string } | null;
  onCancelReply?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function MessageInput({
  value,
  onChange,
  onSend,
  onFileUpload,
  onVoiceRecord,
  replyTo,
  onCancelReply,
  disabled = false,
  placeholder = "Type a message..."
}: MessageInputProps) {
  const { t } = useTranslation();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send, Shift+Enter for new line
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        onSend();
      }
    }
    // Escape to cancel reply
    if (e.key === "Escape" && replyTo && onCancelReply) {
      onCancelReply();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("File type not supported. Please upload images or documents.");
      return;
    }

    onFileUpload(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    onChange(value + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const handleVoiceRecord = () => {
    if (onVoiceRecord) {
      setIsRecording(!isRecording);
      onVoiceRecord();
    } else {
      toast.info("Voice recording coming soon!");
    }
  };

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    
    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white">
      {/* Reply Preview */}
      {replyTo && (
        <div className="px-4 pt-3 pb-2 bg-gray-50 border-b border-gray-200">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#0D9488]">
                Replying to {replyTo.sender_name}
              </p>
              <p className="text-sm text-gray-600 truncate">{replyTo.content}</p>
            </div>
            {onCancelReply && (
              <button
                onClick={onCancelReply}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4">
        <div className="flex items-end gap-2">
          {/* File Upload */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="p-2 text-gray-500 hover:text-[#0D9488] hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title={t('components.message_input.attach_file_title_2', "Attach file")}
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Emoji Picker */}
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              disabled={disabled}
              className="p-2 text-gray-500 hover:text-[#0D9488] hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title={t('components.message_input.add_emoji_title_3', "Add emoji")}
            >
              <Smile className="w-5 h-5" />
            </button>
            {showEmojiPicker && (
              <div className="absolute bottom-full left-0 mb-2">
                <EmojiPicker
                  onSelect={handleEmojiSelect}
                  onClose={() => setShowEmojiPicker(false)}
                />
              </div>
            )}
          </div>

          {/* Text Input */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] disabled:opacity-50 disabled:bg-gray-100"
            style={{ maxHeight: "120px" }}
          />

          {/* Voice Record / Send Button */}
          {value.trim() ? (
            <Button
              onClick={onSend}
              disabled={disabled || !value.trim()}
              className="bg-gradient-to-br from-[#0D9488] to-[#0F766E] text-white hover:shadow-lg transition-all"
            >
              <Send className="w-5 h-5" />
            </Button>
          ) : (
            <button
              onClick={handleVoiceRecord}
              disabled={disabled}
              className={`p-2 rounded-lg transition-all ${
                isRecording
                  ? "bg-red-500 text-white animate-pulse"
                  : "text-gray-500 hover:text-[#0D9488] hover:bg-gray-100"
              } disabled:opacity-50`}
              title={isRecording ? "Recording..." : "Voice message"}
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Keyboard Shortcuts Hint */}
        <p className="text-xs text-gray-400 mt-2">{t('components.message_input.press', "Press")}<kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">{t('components.message_input.enter_1', "Enter")}</kbd> to send,{" "}
          <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  );
}
