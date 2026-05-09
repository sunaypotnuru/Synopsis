import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Mail, Phone, Calendar, CheckCircle, Eye, Trash2, Archive, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  status: "new" | "read" | "replied" | "archived";
  created_at: string;
  updated_at?: string;
}

export default function ContactMessagesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);

  const { data: messages, isLoading } = useQuery({
    queryKey: ["contact-messages"],
    queryFn: async () => {
      const response = await api.get("/api/v1/contact/messages");
      return response.data.data as ContactMessage[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await api.patch(`/api/v1/contact/messages/${id}/status?status=${status}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
      toast.success("Message status updated");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/contact/messages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
      toast.success("Message deleted");
      setSelectedMessage(null);
    },
    onError: () => {
      toast.error("Failed to delete message");
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-700";
      case "read":
        return "bg-yellow-100 text-yellow-700";
      case "replied":
        return "bg-green-100 text-green-700";
      case "archived":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "new":
        return <Mail className="w-4 h-4" />;
      case "read":
        return <Eye className="w-4 h-4" />;
      case "replied":
        return <CheckCircle className="w-4 h-4" />;
      case "archived":
        return <Archive className="w-4 h-4" />;
      default:
        return <Mail className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0FDFA] via-white to-[#F8FAFC] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#0D9488] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[#64748B] dark:text-gray-400">{t('admin.contact_messages_page.loading_messages', "Loading messages...")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0FDFA] via-white to-[#F8FAFC] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-[#0F172A] dark:text-white mb-2">{t('admin.contact_messages_page.contact_messages_1', "Contact Messages")}</h1>
              <p className="text-[#64748B] dark:text-gray-400">{t('admin.contact_messages_page.manage_inquiries_from_the_2', "Manage inquiries from the contact form")}</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-lg px-4 py-2">
                <MessageSquare className="w-5 h-5 mr-2" />
                {messages?.length || 0} Total
              </Badge>
              <Badge className="text-lg px-4 py-2 bg-blue-500">
                {messages?.filter((m) => m.status === "new").length || 0} New
              </Badge>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Messages List */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="p-4 dark:bg-gray-800 dark:border-gray-700">
                <h2 className="text-xl font-bold text-[#0F172A] dark:text-white mb-4">{t('admin.contact_messages_page.all_messages_3', "All Messages")}</h2>
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {messages && messages.length > 0 ? (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        onClick={() => {
                          setSelectedMessage(message);
                          if (message.status === "new") {
                            updateStatusMutation.mutate({ id: message.id, status: "read" });
                          }
                        }}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                          selectedMessage?.id === message.id
                            ? "border-[#0D9488] bg-[#0D9488]/5 dark:bg-teal-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-[#0D9488]/50"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-bold text-[#0F172A] dark:text-white">
                            {message.name}
                          </h3>
                          <Badge className={`${getStatusColor(message.status)} flex items-center gap-1`}>
                            {getStatusIcon(message.status)}
                            {message.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-[#64748B] dark:text-gray-400 mb-2">
                          {message.email}
                        </p>
                        <p className="text-sm text-[#64748B] dark:text-gray-400 line-clamp-2">
                          {message.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-[#64748B] dark:text-gray-500">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(message.created_at), "MMM dd, yyyy HH:mm")}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-[#64748B] dark:text-gray-400">{t('admin.contact_messages_page.no_messages_yet_4', "No messages yet")}</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Message Detail */}
            <div className="lg:col-span-2">
              {selectedMessage ? (
                <Card className="p-8 dark:bg-gray-800 dark:border-gray-700">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-[#0F172A] dark:text-white mb-2">
                        {selectedMessage.name}
                      </h2>
                      <div className="flex items-center gap-4 text-[#64748B] dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          <a href={`mailto:${selectedMessage.email}`} className="hover:text-[#0D9488]">
                            {selectedMessage.email}
                          </a>
                        </div>
                        {selectedMessage.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            <a href={`tel:${selectedMessage.phone}`} className="hover:text-[#0D9488]">
                              {selectedMessage.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge className={`${getStatusColor(selectedMessage.status)} flex items-center gap-1 text-base px-3 py-1`}>
                      {getStatusIcon(selectedMessage.status)}
                      {selectedMessage.status}
                    </Badge>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-[#64748B] dark:text-gray-400 mb-2">{t('admin.contact_messages_page.message_5', "MESSAGE")}</h3>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <p className="text-[#0F172A] dark:text-white whitespace-pre-wrap">
                        {selectedMessage.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-[#64748B] dark:text-gray-400 mb-6">
                    <Calendar className="w-4 h-4" />
                    Received: {format(new Date(selectedMessage.created_at), "MMMM dd, yyyy 'at' HH:mm")}
                  </div>

                  <div className="flex items-center gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      onClick={() => updateStatusMutation.mutate({ id: selectedMessage.id, status: "replied" })}
                      disabled={selectedMessage.status === "replied"}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />{t('admin.contact_messages_page.mark_as_replied_6', "Mark as Replied")}</Button>
                    <Button
                      onClick={() => updateStatusMutation.mutate({ id: selectedMessage.id, status: "archived" })}
                      disabled={selectedMessage.status === "archived"}
                      variant="outline"
                    >
                      <Archive className="w-4 h-4 mr-2" />{t('admin.contact_messages_page.archive_7', "Archive")}</Button>
                    <Button
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this message?")) {
                          deleteMutation.mutate(selectedMessage.id);
                        }
                      }}
                      variant="destructive"
                      className="ml-auto"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />{t('admin.contact_messages_page.delete_8', "Delete")}</Button>
                  </div>
                </Card>
              ) : (
                <Card className="p-8 dark:bg-gray-800 dark:border-gray-700 h-full flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-[#0F172A] dark:text-white mb-2">{t('admin.contact_messages_page.no_message_selected_9', "No Message Selected")}</h3>
                    <p className="text-[#64748B] dark:text-gray-400">{t('admin.contact_messages_page.select_a_message_from_10', "Select a message from the list to view details")}</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

