import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { messagesApi, teamsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { ScrollArea } from '../components/ui/scroll-area';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import { Send, MessageSquare, Users, User, UsersRound } from 'lucide-react';
import { getInitials, formatTime } from '../lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function Chat() {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [recipientType, setRecipientType] = useState('all'); // 'all' or 'specific'
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const messagesEndRef = useRef(null);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    fetchTeams();
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      fetchMessages();
      fetchTeamMembers();
      // Poll for new messages every 5 seconds
      pollIntervalRef.current = setInterval(fetchMessages, 5000);
      return () => clearInterval(pollIntervalRef.current);
    }
  }, [selectedTeam]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchTeams = async () => {
    try {
      const response = await teamsApi.getAll();
      setTeams(response.data);
      if (response.data.length > 0) {
        setSelectedTeam(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    if (!selectedTeam) return;
    try {
      const response = await teamsApi.getMembers(selectedTeam.id);
      // Filter out current user from recipients list
      setTeamMembers(response.data.filter(m => m.id !== user.id));
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const fetchMessages = async () => {
    if (!selectedTeam) return;
    try {
      const response = await messagesApi.getByTeam(selectedTeam.id, 100);
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTeam) return;

    setSending(true);
    try {
      const messageData = {
        team_id: selectedTeam.id,
        content: newMessage.trim()
      };
      
      // Add recipient info based on selection
      if (recipientType === 'specific' && selectedRecipient) {
        messageData.recipient_ids = [selectedRecipient];
      } else {
        messageData.recipient_ids = []; // Empty means broadcast to all
      }
      
      await messagesApi.send(messageData);
      setNewMessage('');
      fetchMessages();
      toast.success(
        recipientType === 'all' 
          ? 'Mensagem enviada para toda a equipa' 
          : 'Mensagem enviada'
      );
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatMessageDate = (date) => {
    const d = new Date(date);
    if (isToday(d)) return 'Hoje';
    if (isYesterday(d)) return 'Ontem';
    return format(d, "d 'de' MMMM", { locale: pt });
  };

  const groupMessagesByDate = (msgs) => {
    const groups = {};
    msgs.forEach(msg => {
      const dateKey = formatMessageDate(msg.created_at);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(msg);
    });
    return groups;
  };

  // Check if message is relevant to current user
  const isMessageRelevant = (msg) => {
    // Broadcast messages (no recipients) are for everyone
    if (!msg.recipient_ids || msg.recipient_ids.length === 0) return true;
    // Message is from me
    if (msg.sender_id === user.id) return true;
    // I am a recipient
    if (msg.recipient_ids.includes(user.id)) return true;
    // Admins see all
    if (user.role === 'admin') return true;
    return false;
  };

  const filteredMessages = messages.filter(isMessageRelevant);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
          <Skeleton className="h-full" />
          <Skeleton className="h-full lg:col-span-3" />
        </div>
      </div>
    );
  }

  const groupedMessages = groupMessagesByDate(filteredMessages);

  return (
    <div className="space-y-6" data-testid="chat-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <MessageSquare className="w-7 h-7 text-primary" />
          Mensagens
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-220px)]">
        {/* Teams Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Equipas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-340px)]">
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => {
                    setSelectedTeam(team);
                    setRecipientType('all');
                    setSelectedRecipient(null);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                    ${selectedTeam?.id === team.id 
                      ? 'bg-primary/10 border-l-4 border-primary' 
                      : 'hover:bg-muted border-l-4 border-transparent'}
                  `}
                  data-testid={`team-${team.id}`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={team.photo_url} />
                    <AvatarFallback>{getInitials(team.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{team.name}</p>
                    <p className="text-xs text-muted-foreground">{team.age_group}</p>
                  </div>
                </button>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-3 flex flex-col">
          {selectedTeam ? (
            <>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{selectedTeam.name}</CardTitle>
                  <Badge variant="secondary">{selectedTeam.age_group}</Badge>
                </div>
              </CardHeader>
              
              {/* Messages */}
              <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-[calc(100vh-450px)] p-4">
                  {Object.keys(groupedMessages).length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <MessageSquare className="w-12 h-12 mb-2 opacity-50" />
                      <p>Sem mensagens</p>
                      <p className="text-sm">Sê o primeiro a enviar uma mensagem!</p>
                    </div>
                  ) : (
                    Object.entries(groupedMessages).map(([date, msgs]) => (
                      <div key={date}>
                        <div className="flex items-center gap-2 my-4">
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-xs text-muted-foreground px-2">{date}</span>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                        {msgs.map((msg) => {
                          const isMe = msg.sender_id === user.id;
                          const isPrivate = msg.recipient_ids && msg.recipient_ids.length > 0;
                          return (
                            <div
                              key={msg.id}
                              className={`flex gap-3 mb-4 ${isMe ? 'flex-row-reverse' : ''}`}
                            >
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarFallback className="text-xs">
                                  {getInitials(msg.sender_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className={`max-w-[70%] ${isMe ? 'text-right' : ''}`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-medium">
                                    {isMe ? 'Tu' : msg.sender_name}
                                  </span>
                                  {isPrivate && (
                                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                                      <User className="w-3 h-3 mr-1" />
                                      Privada
                                    </Badge>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {formatTime(msg.created_at)}
                                  </span>
                                </div>
                                <div
                                  className={`
                                    rounded-lg px-4 py-2 inline-block
                                    ${isMe 
                                      ? 'bg-primary text-primary-foreground' 
                                      : 'bg-muted text-foreground'}
                                  `}
                                >
                                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </ScrollArea>
              </CardContent>

              {/* Message Input */}
              <div className="p-4 border-t">
                {/* Recipient Selection */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm text-muted-foreground">Enviar para:</span>
                  <Select value={recipientType} onValueChange={(v) => {
                    setRecipientType(v);
                    if (v === 'all') setSelectedRecipient(null);
                  }}>
                    <SelectTrigger className="w-[180px]" data-testid="recipient-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <UsersRound className="w-4 h-4" />
                          Toda a equipa
                        </div>
                      </SelectItem>
                      <SelectItem value="specific">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Membro específico
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {recipientType === 'specific' && (
                    <Select value={selectedRecipient || ''} onValueChange={setSelectedRecipient}>
                      <SelectTrigger className="w-[200px]" data-testid="recipient-member-select">
                        <SelectValue placeholder="Seleciona membro..." />
                      </SelectTrigger>
                      <SelectContent>
                        {teamMembers.map(member => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escreve uma mensagem..."
                    className="flex-1"
                    disabled={sending || (recipientType === 'specific' && !selectedRecipient)}
                    data-testid="message-input"
                  />
                  <Button 
                    type="submit" 
                    disabled={sending || !newMessage.trim() || (recipientType === 'specific' && !selectedRecipient)}
                    data-testid="send-message-btn"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Seleciona uma equipa para ver as mensagens</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
