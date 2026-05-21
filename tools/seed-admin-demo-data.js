const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

const schoolAccount = {
  email: 'demo-admin@uit.edu.vn',
  password: 'Admin12345',
  role: 'school'
};

const students = [
  {
    email: '24521001@gm.uit.edu.vn',
    title: 'Deadline môn học',
    content: 'Mình stress vì deadline môn học, mất ngủ hai ngày nay và hơi lo điểm cuối kỳ.',
    tags: ['Stress', 'Mất ngủ', 'Học tập'],
    mood: 2,
    booking: {
      note: 'Mình muốn gặp tư vấn sớm vì stress deadline và mất ngủ.',
      hoursFromNow: 6,
      before_mood_score: 2
    },
    feedback: {
      source_type: 'post_consultation',
      report_text: 'Sau buổi hỗ trợ mình thấy nhẹ hơn và biết chia nhỏ deadline.',
      rating_text: 'Tư vấn rõ ràng, hữu ích.',
      before_mood_score: 2,
      after_mood_score: 4
    }
  },
  {
    email: '24521002@gm.uit.edu.vn',
    title: 'Mất ngủ trước kỳ thi',
    content: 'Gần thi nên mình mất ngủ, càng cố ngủ càng lo và sáng dậy rất mệt.',
    tags: ['Mất ngủ', 'Học tập'],
    mood: 2,
    feedback: {
      source_type: 'feedback',
      report_text: 'Bài thở 5 phút giúp mình bình tĩnh trước khi ngủ.',
      rating_text: 'Nên thêm nhắc nhở buổi tối.',
      before_mood_score: 2,
      after_mood_score: 3
    }
  },
  {
    email: '24521003@gm.uit.edu.vn',
    title: 'Áp lực tài chính',
    content: 'Mình lo về tiền trọ và học phí, cảm giác áp lực tài chính làm mình khó tập trung.',
    tags: ['Tài chính', 'Stress'],
    mood: 2,
    booking: {
      note: 'Cần tư vấn vì áp lực tài chính và học tập.',
      hoursFromNow: 30,
      before_mood_score: 2
    }
  },
  {
    email: '24521004@gm.uit.edu.vn',
    title: 'Mâu thuẫn bạn bè',
    content: 'Mình vừa cãi nhau với bạn thân, thấy cô đơn và không biết nên nói chuyện lại thế nào.',
    tags: ['Mối quan hệ', 'Cô đơn'],
    mood: 3,
    feedback: {
      source_type: 'app',
      report_text: 'Nhật ký giúp mình nhìn lại cảm xúc sau mâu thuẫn bạn bè.',
      rating_text: 'Tính năng tag khá đúng.',
      before_mood_score: 3,
      after_mood_score: 4
    }
  },
  {
    email: '24521005@gm.uit.edu.vn',
    title: 'Lo hướng nghiệp',
    content: 'Mình phân vân hướng nghiệp, sợ chọn sai việc làm sau khi ra trường.',
    tags: ['Hướng nghiệp', 'Học tập'],
    mood: 3,
    feedback: {
      source_type: 'feedback',
      report_text: 'Tài nguyên hướng nghiệp làm mình bớt rối hơn.',
      rating_text: 'Muốn có thêm workshop thực tế.',
      before_mood_score: 3,
      after_mood_score: 4
    }
  },
  {
    email: '24521006@gm.uit.edu.vn',
    title: 'Kiệt sức vì đồ án',
    content: 'Đồ án kéo dài làm mình kiệt sức, stress và không còn động lực.',
    tags: ['Stress', 'Học tập'],
    mood: 1,
    risk: {
      severity: 'high',
      label: 'Dấu hiệu kiệt sức học tập',
      matched_keyword: 'kiệt sức',
      excerpt: 'Sinh viên mô tả kiệt sức vì đồ án và mất động lực.',
      risk_score: 86
    }
  }
];

const password = 'Student12345';
const supportLocation = 'Phòng tham vấn 102 - Khu B';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    const error = new Error(result.error || `Request failed: ${path}`);
    error.status = response.status;
    throw error;
  }

  return result.data;
}

async function registerOrLogin(account) {
  try {
    return await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(account)
    });
  } catch (error) {
    if (error.status !== 409) throw error;
    return await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(account)
    });
  }
}

function authHeaders(session) {
  return { Authorization: `Bearer ${session.token}` };
}

function requestedTime(hoursFromNow) {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
}

async function seedStudent(student, index, schoolSession) {
  const session = await registerOrLogin({
    email: student.email,
    password,
    role: 'student'
  });
  const headers = authHeaders(session);

  const diary = await request('/api/diaries', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: student.title,
      content: student.content,
      tags: student.tags,
      mood_score: student.mood
    })
  });

  await request('/api/interactions', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      type: 'reaction',
      target_id: diary.id,
      metadata: { surface: 'home-feed', count: 3 + index }
    })
  });

  await request('/api/interactions', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      type: 'comment',
      target_id: diary.id,
      metadata: { content_length: 48 + index }
    })
  });

  await request('/api/interactions', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      type: 'resource_view',
      target_id: index % 2 === 0 ? 'Thiền 5 phút giảm lo âu' : 'Blog vượt qua căng thẳng trước kỳ thi',
      metadata: { source: 'seed-demo' }
    })
  });

  await request('/api/interactions', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      type: 'chat',
      target_id: 'chat-support',
      metadata: { message_length: student.content.length }
    })
  });

  if (student.feedback) {
    await request('/api/feedback', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...student.feedback,
        mood_score: student.feedback.after_mood_score
      })
    });
  }

  if (student.booking) {
    const booking = await request('/api/bookings', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        requested_time: requestedTime(student.booking.hoursFromNow),
        note: student.booking.note,
        location: supportLocation,
        before_mood_score: student.booking.before_mood_score
      })
    });

    if (index === 0) {
      await request(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: authHeaders(schoolSession),
        body: JSON.stringify({
          status: 'completed',
          after_mood_score: 4
        })
      });
    }
  }

  if (student.risk) {
    await request('/api/risk-alerts', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        source: 'Diary',
        location: supportLocation,
        ...student.risk
      })
    });
  }
}

async function main() {
  await request('/');
  const schoolSession = await registerOrLogin(schoolAccount);

  for (const [index, student] of students.entries()) {
    await seedStudent(student, index, schoolSession);
  }

  const dashboard = await request('/api/dashboard?range=7', {
    headers: authHeaders(schoolSession)
  });

  console.log(JSON.stringify({
    message: 'Seeded real backend data for admin dashboard',
    api: API_BASE_URL,
    school_login: {
      email: schoolAccount.email,
      password: schoolAccount.password,
      role: schoolAccount.role
    },
    metrics: dashboard.metrics,
    top_topics: dashboard.top_topics,
    risk_queue_count: dashboard.risk_queue.length,
    feedback_count: dashboard.feedback.length
  }, null, 2));
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
