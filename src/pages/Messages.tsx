import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, User as UserIcon, MessageSquare, Search } from 'lucide-react';
import { format } from 'date-fns';

interface Contact {
    id: string;
    name: string;
    role: string;
    unreadCount?: number;
    lastMessageAt?: string;
}

interface Message {
    id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    is_read: boolean;
    created_at: string;
}

const Messages: React.FC = () => {
    const { session, role } = useAuth();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingContacts, setLoadingContacts] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const myId = session?.user?.id;
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const selectedContactRef = useRef<Contact | null>(null);

    // Sync ref when state changes so Realtime listener has latest value
    useEffect(() => {
        selectedContactRef.current = selectedContact;
    }, [selectedContact]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // 1. Fetch Contacts & Attach Global Realtime Subscription
    useEffect(() => {
        if (!myId || !role) return;

        const fetchContacts = async () => {
            setLoadingContacts(true);
            try {
                let fetchedContacts: Contact[] = [];

                if (role === 'student') {
                    // Students talk to Teachers and Admins
                    const { data: teachers } = await supabase.from('teachers').select('id, name');
                    if (teachers) fetchedContacts = [...fetchedContacts, ...teachers.map(t => ({ id: t.id, name: t.name, role: 'teacher' }))];
                    const { data: admins } = await supabase.from('admins').select('id, name');
                    if (admins) fetchedContacts = [...fetchedContacts, ...admins.map(a => ({ id: a.id, name: a.name, role: 'admin' }))];
                } else if (role === 'teacher') {
                    // Teachers talk to Students and Admins
                    const { data: students } = await supabase.from('students').select('id, student_name');
                    if (students) fetchedContacts = [...fetchedContacts, ...students.map(s => ({ id: s.id, name: s.student_name, role: 'student' }))];
                    const { data: admins } = await supabase.from('admins').select('id, name');
                    if (admins) fetchedContacts = [...fetchedContacts, ...admins.map(a => ({ id: a.id, name: a.name, role: 'admin' }))];
                } else if (role === 'admin') {
                    // Admins talk to Students, Teachers, and other Admins
                    const { data: students } = await supabase.from('students').select('id, student_name');
                    if (students) fetchedContacts = [...fetchedContacts, ...students.map(s => ({ id: s.id, name: s.student_name, role: 'student' }))];
                    const { data: teachers } = await supabase.from('teachers').select('id, name');
                    if (teachers) fetchedContacts = [...fetchedContacts, ...teachers.map(t => ({ id: t.id, name: t.name, role: 'teacher' }))];
                    const { data: admins } = await supabase.from('admins').select('id, name');
                    if (admins) fetchedContacts = [...fetchedContacts, ...admins.filter(a => a.id !== myId).map(a => ({ id: a.id, name: a.name, role: 'admin' }))];
                }

                // Deduplicate contacts by id to handle accidental duplicates in the database/combining
                const uniqueContactsMap = new Map<string, Contact>();
                fetchedContacts.forEach(c => {
                    uniqueContactsMap.set(c.id, c);
                });
                const uniqueContacts = Array.from(uniqueContactsMap.values());

                // Fetch all messages involving the user to get unread counts and last message time
                const { data: allMessagesData } = await supabase
                    .from('messages')
                    .select('sender_id, receiver_id, created_at, is_read')
                    .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`);

                let unreadMap: Record<string, number> = {};
                let lastMessageMap: Record<string, string> = {};

                if (allMessagesData) {
                    allMessagesData.forEach(msg => {
                        const otherId = msg.sender_id === myId ? msg.receiver_id : msg.sender_id;
                        
                        // Unread count
                        if (msg.receiver_id === myId && !msg.is_read) {
                            unreadMap[msg.sender_id] = (unreadMap[msg.sender_id] || 0) + 1;
                        }

                        // Last message time
                        if (!lastMessageMap[otherId] || new Date(msg.created_at) > new Date(lastMessageMap[otherId])) {
                            lastMessageMap[otherId] = msg.created_at;
                        }
                    });
                }

                // Append unread Count and lastMessageAt
                const finalContacts = uniqueContacts.map(c => ({
                    ...c,
                    unreadCount: unreadMap[c.id] || 0,
                    lastMessageAt: lastMessageMap[c.id] || undefined
                }));

                setContacts(finalContacts);
            } catch (err) {
                console.error('Error fetching contacts:', err);
            } finally {
                setLoadingContacts(false);
            }
        };

        fetchContacts();

        // Global Realtime Subscription for ALL messages
        const channel = supabase
            .channel(`chat_global_${myId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                (payload) => {
                    const newMessage = payload.new as Message;
                    const currentlySelectedId = selectedContactRef.current?.id;
                    const isThisConversation =
                        (newMessage.sender_id === myId && newMessage.receiver_id === currentlySelectedId) ||
                        (newMessage.sender_id === currentlySelectedId && newMessage.receiver_id === myId);

                    const otherId = newMessage.sender_id === myId ? newMessage.receiver_id : newMessage.sender_id;

                    if (isThisConversation) {
                        setMessages((prev) => [...prev, newMessage]);
                        if (newMessage.receiver_id === myId) {
                            // Automatically mark as read if conversation is open
                            supabase.from('messages').update({ is_read: true }).eq('id', newMessage.id).then();
                        }
                    }

                    // Always update lastMessageAt, and unread count if it's from someone else and not currently open
                    // Note: We only process messages that are related to the current user
                    if (newMessage.sender_id === myId || newMessage.receiver_id === myId) {
                        setContacts(prev => prev.map(c => {
                            if (c.id === otherId) {
                                const shouldIncrementUnread = newMessage.receiver_id === myId && !isThisConversation;
                                return {
                                    ...c,
                                    lastMessageAt: newMessage.created_at,
                                    unreadCount: shouldIncrementUnread ? (c.unreadCount || 0) + 1 : c.unreadCount
                                };
                            }
                            return c;
                        }));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [myId, role]);

    // 2. Fetch Messages for Selected Contact
    useEffect(() => {
        if (!myId || !selectedContact) return;

        const fetchMessages = async () => {
            setLoadingMessages(true);
            try {
                const { data, error } = await supabase
                    .from('messages')
                    .select('*')
                    .or(`and(sender_id.eq.${myId},receiver_id.eq.${selectedContact.id}),and(sender_id.eq.${selectedContact.id},receiver_id.eq.${myId})`)
                    .order('created_at', { ascending: true });

                if (error) throw error;
                setMessages(data || []);

                // Mark unread messages as read
                const unreadToMe = (data || []).filter(m => m.receiver_id === myId && !m.is_read);
                if (unreadToMe.length > 0) {
                    const unreadIds = unreadToMe.map(m => m.id);
                    await supabase.from('messages').update({ is_read: true }).in('id', unreadIds);
                }
            } catch (err) {
                console.error('Error fetching messages:', err);
            } finally {
                setLoadingMessages(false);
            }
        };

        fetchMessages();
    }, [myId, selectedContact]);

    const handleSelectContact = (c: Contact) => {
        setSelectedContact(c);
        // Optimistically clear unread count
        setContacts(prev => prev.map(contact =>
            contact.id === c.id ? { ...contact, unreadCount: 0 } : contact
        ));
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !myId || !selectedContact) return;

        const content = newMessage.trim();
        setNewMessage(''); // optimistic clear

        try {
            const { error } = await supabase.from('messages').insert({
                sender_id: myId,
                receiver_id: selectedContact.id,
                content: content,
            });

            if (error) throw error;
        } catch (err) {
            console.error('Error sending message:', err);
        }
    };

    const filteredContacts = contacts
        .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => {
            const dateA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
            const dateB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
            
            if (dateA !== dateB) {
                return dateB - dateA;
            }
            
            return a.name.localeCompare(b.name);
        });

    return (
        <div className="h-[calc(100vh-10rem)] min-h-[500px] flex gap-4 md:gap-6">
            {/* Sidebar: Contacts */}
            <Card className="w-1/3 md:w-1/4 h-full flex flex-col overflow-hidden border bg-background">
                <div className="p-4 border-b font-semibold flex items-center gap-2 shrink-0">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    Conversations
                </div>
                <div className="p-3 border-b shrink-0 bg-muted/10">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search contacts..."
                            className="pl-9 bg-background"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loadingContacts ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">Loading contacts...</div>
                    ) : contacts.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">No contacts found.</div>
                    ) : filteredContacts.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">No contacts match your search.</div>
                    ) : (
                        <ul className="flex flex-col">
                            {filteredContacts.map(c => (
                                <li key={c.id}>
                                    <button
                                        onClick={() => handleSelectContact(c)}
                                        className={`w-full flex items-center justify-between text-left p-4 border-b transition-colors hover:bg-muted/50 ${selectedContact?.id === c.id ? 'bg-primary/10 border-l-4 border-l-primary' : ''}`}
                                    >
                                        <div className="overflow-hidden">
                                            <p className={`font-medium truncate ${c.unreadCount ? 'font-bold' : ''}`}>{c.name}</p>
                                            <p className="text-xs text-muted-foreground capitalize">{c.role}</p>
                                        </div>
                                        {c.unreadCount && c.unreadCount > 0 ? (
                                            <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-2 shrink-0">
                                                {c.unreadCount}
                                            </span>
                                        ) : null}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </Card>

            {/* Main: Chat area */}
            <Card className="flex-1 h-full flex flex-col overflow-hidden border relative">
                {selectedContact ? (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                    <UserIcon className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">{selectedContact.name}</h3>
                                    <p className="text-xs text-muted-foreground capitalize">{selectedContact.role}</p>
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {loadingMessages ? (
                                <div className="flex justify-center items-center h-full text-muted-foreground">
                                    Loading conversation...
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex justify-center items-center h-full text-muted-foreground flex-col gap-2">
                                    <MessageSquare className="w-8 h-8 opacity-20" />
                                    <p>No messages yet. Say hello!</p>
                                </div>
                            ) : (
                                messages.map((msg) => {
                                    const isMe = msg.sender_id === myId;
                                    return (
                                        <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div
                                                className={`max-w-[70%] rounded-2xl px-4 py-2 ${isMe
                                                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                                    : 'bg-muted text-foreground rounded-tl-sm'
                                                    }`}
                                            >
                                                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                                                <p className={`text-[10px] mt-1 ${isMe ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground'}`}>
                                                    {format(new Date(msg.created_at), 'MMM d, HH:mm')}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t mt-auto bg-background">
                            <form
                                className="flex gap-2"
                                onSubmit={sendMessage}
                            >
                                <Input
                                    placeholder="Type a message..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    className="flex-1"
                                    autoFocus
                                />
                                <Button type="submit" disabled={!newMessage.trim() || !myId || !selectedContact}>
                                    <Send className="w-4 h-4" />
                                </Button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground flex-col gap-4">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                            <MessageSquare className="w-8 h-8 opacity-50" />
                        </div>
                        <p>Select a conversation to start messaging</p>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default Messages;
