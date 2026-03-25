-- ============================================
-- 029_enable_rls_all_tables.sql
-- Enable Row Level Security on all 15 tables
--
-- Uses auth.uid()::text cast for compatibility
-- with both UUID and TEXT column types.
-- ============================================

-- 1. sessions (student1_id, student2_id)
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own sessions"
    ON public.sessions FOR SELECT
    USING (auth.uid()::text = student1_id::text OR auth.uid()::text = student2_id::text);
CREATE POLICY "Users can insert own sessions"
    ON public.sessions FOR INSERT
    WITH CHECK (auth.uid()::text = student1_id::text OR auth.uid()::text = student2_id::text);

-- 2. notifications (user_id)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own notifications"
    ON public.notifications FOR SELECT USING (auth.uid()::text = user_id::text);


-- 4. availability (user_id)
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own availability"
    ON public.availability FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can manage own availability"
    ON public.availability FOR ALL USING (auth.uid()::text = user_id::text) WITH CHECK (auth.uid()::text = user_id::text);

-- 5. user_statuses (user_id)
ALTER TABLE public.user_statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read statuses"
    ON public.user_statuses FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can manage own status"
    ON public.user_statuses FOR ALL USING (auth.uid()::text = user_id::text) WITH CHECK (auth.uid()::text = user_id::text);

-- 6. bookings (requester_id, target_id)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own bookings"
    ON public.bookings FOR SELECT
    USING (auth.uid()::text = requester_id::text OR auth.uid()::text = target_id::text);
CREATE POLICY "Users can insert own bookings"
    ON public.bookings FOR INSERT WITH CHECK (auth.uid()::text = requester_id::text);

-- 7. students (id = user id)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read all students"
    ON public.students FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update own student record"
    ON public.students FOR UPDATE USING (auth.uid()::text = id::text) WITH CHECK (auth.uid()::text = id::text);
CREATE POLICY "Users can insert own student record"
    ON public.students FOR INSERT WITH CHECK (auth.uid()::text = id::text);

-- 8. birthday_wishes (from_user_id, to_user_id)
ALTER TABLE public.birthday_wishes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read birthday wishes"
    ON public.birthday_wishes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert own birthday wishes"
    ON public.birthday_wishes FOR INSERT WITH CHECK (auth.uid()::text = from_user_id::text);

-- 9. friend_requests (from_user_id, to_user_id)
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own friend requests"
    ON public.friend_requests FOR SELECT
    USING (auth.uid()::text = from_user_id::text OR auth.uid()::text = to_user_id::text);
CREATE POLICY "Users can send friend requests"
    ON public.friend_requests FOR INSERT WITH CHECK (auth.uid()::text = from_user_id::text);
CREATE POLICY "Users can update own friend requests"
    ON public.friend_requests FOR UPDATE
    USING (auth.uid()::text = from_user_id::text OR auth.uid()::text = to_user_id::text);

-- 10. friendships (user1_id, user2_id)
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own friendships"
    ON public.friendships FOR SELECT
    USING (auth.uid()::text = user1_id::text OR auth.uid()::text = user2_id::text);
CREATE POLICY "Users can delete own friendships"
    ON public.friendships FOR DELETE
    USING (auth.uid()::text = user1_id::text OR auth.uid()::text = user2_id::text);

-- 11. ratings (from_user_id, to_user_id)
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read ratings"
    ON public.ratings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert own ratings"
    ON public.ratings FOR INSERT WITH CHECK (auth.uid()::text = from_user_id::text);
CREATE POLICY "Users can update own ratings"
    ON public.ratings FOR UPDATE USING (auth.uid()::text = from_user_id::text);

-- 12. subscriptions (user_id)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own subscriptions"
    ON public.subscriptions FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can manage own subscriptions"
    ON public.subscriptions FOR ALL USING (auth.uid()::text = user_id::text) WITH CHECK (auth.uid()::text = user_id::text);

-- 13. messages (sender_id, receiver_id)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own messages"
    ON public.messages FOR SELECT
    USING (auth.uid()::text = sender_id::text OR auth.uid()::text = receiver_id::text);
CREATE POLICY "Users can send messages"
    ON public.messages FOR INSERT WITH CHECK (auth.uid()::text = sender_id::text);

-- 14. chat_threads (user1_id, user2_id)
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own chat threads"
    ON public.chat_threads FOR SELECT
    USING (auth.uid()::text = user1_id::text OR auth.uid()::text = user2_id::text);
CREATE POLICY "Users can create chat threads"
    ON public.chat_threads FOR INSERT
    WITH CHECK (auth.uid()::text = user1_id::text OR auth.uid()::text = user2_id::text);


