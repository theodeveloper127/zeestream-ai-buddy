import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export const ChatButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Hide on chat page
  if (location.pathname === '/chat') return null;

  return (
    <Button
      onClick={() => navigate('/chat')}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full btn-stream chat-bounce shadow-glow"
      size="lg"
    >
      <MessageCircle className="w-6 h-6" />
    </Button>
  );
};