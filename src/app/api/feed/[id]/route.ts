// ============================================
// MitrRAI - Campus Feed Post API
// DELETE: delete own post
// GET:    imin_users (post author only) | comments
// POST:   toggle reaction | add comment
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';
import { deletePost, toggleReaction } from '@/lib/store/feed';
import { supabase } from '@/lib/store/core';

export const dynamic = 'force-dynamic';

function createTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: (process.env.SMTP_EMAIL || '').trim(),
      pass: (process.env.SMTP_APP_PASSWORD || '').trim(),
    },
    connectionTimeout: 4000,
  });
}

// GET /api/feed/[id]?action=imin_users   → who clicked "I'm in" (post author only)
// GET /api/feed/[id]?action=comments     → comments on the post
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const action = req.nextUrl.searchParams.get('action');

  if (action === 'imin_users') {
    // Verify requester is the post author
    const { data: post } = await supabase
      .from('campus_posts')
      .select('user_id')
      .eq('id', params.id)
      .single();

    if (!post || post.user_id !== authUser.id) {
      return NextResponse.json({ success: false, error: 'Only the post author can see this' }, { status: 403 });
    }

    const { data: reactions } = await supabase
      .from('post_reactions')
      .select('user_id')
      .eq('post_id', params.id)
      .eq('type', 'imin');

    const userIds = (reactions || []).map((r: { user_id: string }) => r.user_id);
    if (userIds.length === 0) return NextResponse.json({ success: true, data: [] });

    const { data: students } = await supabase
      .from('students')
      .select('id, name, department, year_level')
      .in('id', userIds);

    return NextResponse.json({ success: true, data: students || [] });
  }

  if (action === 'comments') {
    const { data: comments, error } = await supabase
      .from('post_comments')
      .select('id, user_id, user_name, content, created_at')
      .eq('post_id', params.id)
      .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ success: false, error: 'Failed to fetch comments' }, { status: 500 });
    return NextResponse.json({ success: true, data: comments || [] });
  }

  return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
}

// DELETE /api/feed/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  try {
    const result = await deletePost(params.id, authUser.id);
    if (!result.success) return NextResponse.json(result, { status: 403 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Feed DELETE error:', error);
    return NextResponse.json({ success: false, error: 'kuch gadbad ho gayi, dobara try karo 🙏' }, { status: 500 });
  }
}

// POST /api/feed/[id] { action: 'react', type: 'imin'|'reply'|'connect' }
//                    | { action: 'comment', content: string }
//                    | { action: 'direct_message', content: string }
//                    | { action: 'report' }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  if (!rateLimit(`feed-react:${authUser.id}`, 60, 60_000)) return rateLimitExceeded();

  try {
    const body = await req.json();
    const { action, type, content } = body;

    if (action === 'react') {
      if (!type) return NextResponse.json({ success: false, error: 'Reaction type required' }, { status: 400 });
      const result = await toggleReaction(params.id, authUser.id, type);
      return NextResponse.json(result);
    }

    if (action === 'comment') {
      if (!content?.trim()) return NextResponse.json({ success: false, error: 'Comment content required' }, { status: 400 });
      if (content.length > 200) return NextResponse.json({ success: false, error: 'Max 200 characters' }, { status: 400 });

      // Fetch user name
      const { data: student } = await supabase.from('students').select('name').eq('id', authUser.id).single();
      const userName = student?.name || 'Student';

      const { data: comment, error } = await supabase
        .from('post_comments')
        .insert({ post_id: params.id, user_id: authUser.id, user_name: userName, content: content.trim() })
        .select('id, user_id, user_name, content, created_at')
        .single();

      if (error) {
        console.error('Failed to save comment:', error);
        return NextResponse.json({ success: false, error: 'Failed to save comment', details: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, data: comment });
    }

    if (action === 'direct_message') {
      if (!content?.trim()) return NextResponse.json({ success: false, error: 'Message content required' }, { status: 400 });

      // Find the post author to get the receiver ID securely
      const { data: post } = await supabase.from('campus_posts').select('user_id').eq('id', params.id).single();
      if (!post || !post.user_id) return NextResponse.json({ success: false, error: 'Post or author not found' }, { status: 404 });
      
      const receiverId = post.user_id;
      if (receiverId === authUser.id) return NextResponse.json({ success: false, error: 'Cannot message yourself' }, { status: 400 });

      // Determine chat room ID (alphabetical combination of user IDs)
      const chatId = [authUser.id, receiverId].sort().join('_');

      // Ensure chat room exists
      await supabase.from('chat_rooms').upsert({
        id: chatId,
        user1_id: [authUser.id, receiverId].sort()[0],
        user2_id: [authUser.id, receiverId].sort()[1],
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

      // Fetch sender name
      const { data: student } = await supabase.from('students').select('name').eq('id', authUser.id).single();
      const senderName = student?.name || 'Student';

      // Insert message
      const { error } = await supabase.from('chat_messages').insert({
        chat_id: chatId,
        sender_id: authUser.id,
        sender_name: senderName,
        text: content.trim(),
        is_read: false
      });

      if (error) {
        console.error('Failed to send direct message:', error);
        return NextResponse.json({ success: false, error: 'Failed to send message', details: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'report') {
      // 1. Get the post author
      const { data: post } = await supabase.from('campus_posts').select('user_id').eq('id', params.id).single();
      if (!post || !post.user_id) return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
      
      const reportedUserId = post.user_id;
      if (reportedUserId === authUser.id) return NextResponse.json({ success: false, error: 'Cannot report yourself' }, { status: 400 });

      // 2. Insert the report
      const { error: insertErr } = await supabase.from('post_reports').insert({
        reporter_id: authUser.id,
        post_id: params.id,
        reported_user_id: reportedUserId,
        reason: 'Inappropriate content',
        status: 'pending'
      });

      // Ignore uniqueness constraint failures (if the user already reported this exact post)
      if (insertErr && insertErr.code !== '23505') {
        console.error('Failed to report post:', insertErr);
        return NextResponse.json({ success: false, error: 'Failed to report post', details: insertErr.message }, { status: 500 });
      }

      // 3. Count total reports against this user across all their posts
      const { count: reportCount, error: countErr } = await supabase
        .from('post_reports')
        .select('*', { count: 'exact', head: true })
        .eq('reported_user_id', reportedUserId);
        
      if (!countErr && reportCount !== null) {
         // Notify the reported user via direct system chat message
         const chatId = ['system', reportedUserId].sort().join('_');
         await supabase.from('chat_rooms').upsert({
           id: chatId, user1_id: 'system', user2_id: reportedUserId, updated_at: new Date().toISOString()
         }, { onConflict: 'id' });
         
         const warningsLeft = Math.max(0, 5 - reportCount);
         let messageText = `⚠️ **System Alert**: Someone has reported your anonymous post for inappropriate content.\n\nYou have received ${reportCount} total reports.`;
         
         if (reportCount >= 5) {
            messageText += `\n\n🚨 **URGENT WARNING**: You have reached 5 reports. Your account has been flagged for admin review. Pending admin approval, your account might be suspended rapidly. Please adhere to the community guidelines.`;
            
            // Send email to admin
            try {
               const adminEmail = (process.env.SMTP_EMAIL || '').trim();
               if (adminEmail) {
                  // Fetch who reported the user
                  const { data: reportRows } = await supabase
                    .from('post_reports')
                    .select('reporter_id')
                    .eq('reported_user_id', reportedUserId);
                    
                  const reporterIds = reportRows?.map(r => r.reporter_id) || [];
                  let reporterListHtml = '<p>No reporter details available.</p>';
                  
                  if (reporterIds.length > 0) {
                    const { data: students } = await supabase
                      .from('students')
                      .select('id, name')
                      .in('id', reporterIds);
                      
                    if (students && students.length > 0) {
                      reporterListHtml = '<ul>' + students.map(s => `<li><strong>${s.name}</strong> (ID: ${s.id})</li>`).join('') + '</ul>';
                    }
                  }

                  const t = createTransporter();
                  await t.sendMail({
                     from: `"MitrRAI Safety" <${adminEmail}>`,
                     to: adminEmail,
                     subject: `🚨 MitrRAI: User reached 5 reports!`,
                     html: `
                        <h3>Action Required: User reached 5 reports</h3>
                        <p>Reported User ID: <strong>${reportedUserId}</strong></p>
                        <p>This user's anonymous posts have been reported 5 times.</p>
                        <h4>Users who filed these reports:</h4>
                        ${reporterListHtml}
                        <hr />
                        <p>Please review their account in the Supabase Dashboard and decide whether to block or ban them.</p>
                     `
                  });
               }
            } catch (mailErr) {
               console.error('Failed to send admin report email:', mailErr);
            }
         } else {
            messageText += `\nBe careful! You will receive a block WARNING after 5 total reports. (${warningsLeft} reports remaining).`;
         }

         await supabase.from('chat_messages').insert({
           chat_id: chatId,
           sender_id: '00000000-0000-0000-0000-000000000000', // Null UUID pattern for system
           sender_name: 'MitrRAI Safety Team',
           text: messageText,
           is_read: false
         });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Feed POST error:', error);
    return NextResponse.json({ success: false, error: 'kuch gadbad ho gayi, dobara try karo 🙏' }, { status: 500 });
  }
}
