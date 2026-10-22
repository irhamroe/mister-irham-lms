function setupSocket(io) {
  io.on('connection', (socket) => {
    // Join exam proctoring room
    socket.on('join_exam', ({ exam_id, user }) => {
      const room = `exam:${exam_id}`;
      socket.join(room);
      socket.exam_id = exam_id;
      socket.user = user;

      // Broadcast student active status
      if (user && user.role === 'siswa') {
        io.to(room).emit('student_online', {
          student_id: user.id,
          name: user.name,
          time: new Date().toISOString()
        });
      }
    });

    // Student updates progress live as they pick answers
    socket.on('student_progress', ({ exam_id, student_id, answered_count, total_questions, doubtful_count }) => {
      const room = `exam:${exam_id}`;
      const progress_percent = total_questions > 0 ? Math.round((answered_count / total_questions) * 100) : 0;
      io.to(room).emit('live_progress_update', {
        student_id,
        answered_count,
        progress_percent,
        doubtful_count,
        timestamp: new Date().toISOString()
      });
    });

    // Student triggers anti-cheat violation
    socket.on('student_violation', ({ exam_id, student_id, student_name, event_type, details, violation_count, is_blocked }) => {
      const room = `exam:${exam_id}`;
      io.to(room).emit('live_violation_alert', {
        student_id,
        student_name,
        event_type,
        details,
        violation_count,
        is_blocked,
        timestamp: new Date().toLocaleTimeString('id-ID')
      });
    });

    // Student completes exam
    socket.on('student_submitted', ({ exam_id, student_id, student_name, score }) => {
      const room = `exam:${exam_id}`;
      io.to(room).emit('live_student_submitted', {
        student_id,
        student_name,
        score,
        timestamp: new Date().toLocaleTimeString('id-ID')
      });
    });

    // Teacher remote proctor action (Unlock / Reset, Force Submit, Add Time)
    socket.on('teacher_proctor_action', ({ exam_id, student_id, action, minutes, message }) => {
      const room = `exam:${exam_id}`;
      io.to(room).emit('live_proctor_action', {
        student_id,
        action,
        minutes,
        message,
        timestamp: new Date().toISOString()
      });
    });

    // Teacher broadcasts announcement to all students in exam
    socket.on('teacher_broadcast', ({ exam_id, message }) => {
      const room = `exam:${exam_id}`;
      io.to(room).emit('live_announcement', {
        message,
        timestamp: new Date().toLocaleTimeString('id-ID')
      });
    });

    socket.on('disconnect', () => {
      if (socket.exam_id && socket.user) {
        io.to(`exam:${socket.exam_id}`).emit('student_offline', {
          student_id: socket.user.id,
          name: socket.user.name
        });
      }
    });
  });
}

module.exports = setupSocket;
