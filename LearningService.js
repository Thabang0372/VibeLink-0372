class LearningService {
    constructor(app) {
        this.app = app;
    }

    async createCourse(courseData) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeCourse = this.app.services.parse.getClass('VibeCourse');
        const course = new VibeCourse();
        
        course.set('instructor', this.app.currentUser);
        course.set('title', courseData.title);
        course.set('description', courseData.description);
        course.set('category', courseData.category);
        course.set('price', courseData.price || 0);
        course.set('level', courseData.level || 'beginner');
        course.set('modules', []);
        course.set('enrolledStudents', []);
        course.set('thumbnail', courseData.thumbnail);
        course.set('objectives', courseData.objectives || []);
        course.set('requirements', courseData.requirements || []);
        course.set('tags', courseData.tags || []);

        await course.save();
        
        this.app.showSuccess('Course created successfully! 📚');
        return course;
    }

    async enrollInCourse(courseId) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeCourse = this.app.services.parse.getClass('VibeCourse');
        const query = new Parse.Query(VibeCourse);
        const course = await query.get(courseId);
        
        const enrolledStudents = course.get('enrolledStudents') || [];
        
        // Check if already enrolled
        if (enrolledStudents.some(student => student.id === this.app.currentUser.id)) {
            throw new Error('You are already enrolled in this course');
        }

        // Process payment if course isn't free
        const price = course.get('price');
        if (price > 0) {
            const userWallet = await this.app.services.wallet.getUserWallet();
            if (userWallet.get('balance') < price) {
                throw new Error('Insufficient balance to enroll in course');
            }

            // Transfer to instructor
            const instructorWallet = await this.app.services.wallet.getUserWallet(course.get('instructor').id);
            await this.app.services.wallet.createWalletTransaction({
                type: 'credit',
                amount: price,
                wallet: instructorWallet,
                description: `Course enrollment: ${course.get('title')}`
            });

            // Deduct from student
            await this.app.services.wallet.createWalletTransaction({
                type: 'debit',
                amount: price,
                wallet: userWallet,
                description: `Enrollment in: ${course.get('title')}`
            });
        }

        course.addUnique('enrolledStudents', this.app.currentUser);
        await course.save();

        // Create student progress record
        await this.createStudentProgress(courseId);

        await this.app.services.wallet.addLoyaltyPoints(10, 'course_enrollment');

        this.app.showSuccess('Successfully enrolled in the course! 🎓');
        return course;
    }

    async createStudentProgress(courseId) {
        const VibeStudentProgress = this.app.services.parse.getClass('VibeStudentProgress');
        const progress = new VibeStudentProgress();
        
        progress.set('student', this.app.currentUser);
        progress.set('course', this.app.services.parse.createPointer('VibeCourse', courseId));
        progress.set('completedModules', []);
        progress.set('currentModule', 0);
        progress.set('progressPercentage', 0);
        progress.set('quizScores', {});
        progress.set('timeSpent', 0);
        progress.set('lastAccessed', new Date());

        await progress.save();
        return progress;
    }

    async addModule(courseId, moduleData) {
        const VibeCourse = this.app.services.parse.getClass('VibeCourse');
        const query = new Parse.Query(VibeCourse);
        query.equalTo('instructor', this.app.currentUser);
        const course = await query.get(courseId);

        const modules = course.get('modules') || [];
        const newModule = {
            id: Date.now().toString(),
            title: moduleData.title,
            description: moduleData.description,
            content: moduleData.content,
            videoUrl: moduleData.videoUrl,
            duration: moduleData.duration,
            resources: moduleData.resources || [],
            quiz: moduleData.quiz || null,
            order: modules.length
        };

        modules.push(newModule);
        course.set('modules', modules);
        await course.save();

        this.app.showSuccess('Module added successfully!');
        return course;
    }

    async completeModule(courseId, moduleId) {
        const VibeStudentProgress = this.app.services.parse.getClass('VibeStudentProgress');
        const query = new VibeStudentProgress();
        query.equalTo('student', this.app.currentUser);
        query.equalTo('course', this.app.services.parse.createPointer('VibeCourse', courseId));
        const progress = await query.first();

        if (!progress) {
            throw new Error('Progress record not found');
        }

        const completedModules = progress.get('completedModules') || [];
        if (!completedModules.includes(moduleId)) {
            completedModules.push(moduleId);
            progress.set('completedModules', completedModules);
        }

        // Calculate progress percentage
        const VibeCourse = this.app.services.parse.getClass('VibeCourse');
        const courseQuery = new Parse.Query(VibeCourse);
        const course = await courseQuery.get(courseId);
        const totalModules = course.get('modules').length;
        const progressPercentage = (completedModules.length / totalModules) * 100;

        progress.set('progressPercentage', progressPercentage);
        progress.set('lastAccessed', new Date());
        await progress.save();

        // Award points for module completion
        if (progressPercentage === 100) {
            await this.app.services.wallet.addLoyaltyPoints(50, 'course_completion');
            this.app.showSuccess('Course completed! 🎉');
        } else {
            await this.app.services.wallet.addLoyaltyPoints(5, 'module_completion');
        }

        return progress;
    }

    async createQuiz(quizData) {
        const VibeQuiz = this.app.services.parse.getClass('VibeQuiz');
        const quiz = new VibeQuiz();
        
        quiz.set('title', quizData.title);
        quiz.set('description', quizData.description);
        quiz.set('questions', quizData.questions);
        quiz.set('timeLimit', quizData.timeLimit);
        quiz.set('passingScore', quizData.passingScore || 70);
        quiz.set('maxAttempts', quizData.maxAttempts || 3);
        quiz.set('course', quizData.courseId ? this.app.services.parse.createPointer('VibeCourse', quizData.courseId) : null);
        quiz.set('tags', quizData.tags || []);

        await quiz.save();
        return quiz;
    }

    async submitQuiz(quizId, answers) {
        const VibeQuiz = this.app.services.parse.getClass('VibeQuiz');
        const query = new Parse.Query(VibeQuiz);
        const quiz = await query.get(quizId);

        const questions = quiz.get('questions');
        let score = 0;
        const results = [];

        // Calculate score
        questions.forEach((question, index) => {
            const userAnswer = answers[index];
            const isCorrect = userAnswer === question.correctAnswer;
            
            if (isCorrect) {
                score += question.points || 1;
            }

            results.push({
                question: question.question,
                userAnswer: userAnswer,
                correctAnswer: question.correctAnswer,
                isCorrect: isCorrect,
                explanation: question.explanation
            });
        });

        const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);
        const percentage = (score / totalPoints) * 100;
        const passed = percentage >= quiz.get('passingScore');

        // Save attempt
        const quizAttempt = await this.saveQuizAttempt(quizId, {
            score: percentage,
            passed: passed,
            answers: answers,
            results: results,
            timeSpent: answers.timeSpent || 0
        });

        // Award points for passing
        if (passed) {
            await this.app.services.wallet.addLoyaltyPoints(15, 'quiz_passed');
        }

        return {
            attempt: quizAttempt,
            score: percentage,
            passed: passed,
            results: results,
            passingScore: quiz.get('passingScore')
        };
    }

    async saveQuizAttempt(quizId, attemptData) {
        const VibeQuizAttempt = this.app.services.parse.getClass('VibeQuizAttempt');
        const attempt = new VibeQuizAttempt();
        
        attempt.set('student', this.app.currentUser);
        attempt.set('quiz', this.app.services.parse.createPointer('VibeQuiz', quizId));
        attempt.set('score', attemptData.score);
        attempt.set('passed', attemptData.passed);
        attempt.set('answers', attemptData.answers);
        attempt.set('results', attemptData.results);
        attempt.set('timeSpent', attemptData.timeSpent);
        attempt.set('completedAt', new Date());

        await attempt.save();
        return attempt;
    }

    async startLiveTutoringSession(sessionData) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeLiveTutoring = this.app.services.parse.getClass('VibeLiveTutoring');
        const session = new VibeLiveTutoring();
        
        session.set('tutor', this.app.currentUser);
        session.set('title', sessionData.title);
        session.set('subject', sessionData.subject);
        session.set('description', sessionData.description);
        session.set('pricePerHour', sessionData.pricePerHour || 0);
        session.set('maxStudents', sessionData.maxStudents || 10);
        session.set('students', []);
        session.set('isLive', true);
        session.set('whiteboardData', {});
        session.set('resources', sessionData.resources || []);
        session.set('scheduledStart', new Date(sessionData.scheduledStart));
        session.set('actualStart', new Date());

        await session.save();

        // Create tutoring chat room
        const chatRoom = await this.app.services.chat.createChatRoom(
            `Tutoring - ${sessionData.title}`,
            true,
            []
        );

        session.set('chatRoom', chatRoom);
        await session.save();

        await this.app.services.notifications.notifyFollowers(
            `${this.app.currentUser.get('username')} started a live tutoring session: ${sessionData.title}`
        );

        this.app.showSuccess('Live tutoring session started! 👨‍🏫');
        return { session, chatRoom };
    }

    async joinLiveTutoringSession(sessionId) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeLiveTutoring = this.app.services.parse.getClass('VibeLiveTutoring');
        const query = new Parse.Query(VibeLiveTutoring);
        const session = await query.get(sessionId);
        
        if (!session.get('isLive')) {
            throw new Error('Session is not live');
        }

        const students = session.get('students') || [];
        const maxStudents = session.get('maxStudents');
        
        if (students.length >= maxStudents) {
            throw new Error('Session is full');
        }

        // Process payment if required
        const pricePerHour = session.get('pricePerHour');
        if (pricePerHour > 0 && session.get('tutor').id !== this.app.currentUser.id) {
            const userWallet = await this.app.services.wallet.getUserWallet();
            if (userWallet.get('balance') < pricePerHour) {
                throw new Error('Insufficient balance to join session');
            }

            // Reserve payment (will be processed when session ends)
            await this.reserveTutoringPayment(sessionId, pricePerHour);
        }

        session.addUnique('students', this.app.currentUser);
        await session.save();

        // Add student to chat room
        const chatRoom = session.get('chatRoom');
        if (chatRoom) {
            await this.app.services.chat.addToChatRoom(chatRoom.id, this.app.currentUser.id);
        }

        this.app.services.realtime.broadcastUpdate('student_joined_tutoring', {
            sessionId: sessionId,
            student: this.app.currentUser.get('username'),
            studentCount: students.length + 1
        });

        this.app.showSuccess('Joined the tutoring session!');
        return session;
    }

    async reserveTutoringPayment(sessionId, amount) {
        const VibeTutoringPayment = this.app.services.parse.getClass('VibeTutoringPayment');
        const payment = new VibeTutoringPayment();
        
        payment.set('student', this.app.currentUser);
        payment.set('session', this.app.services.parse.createPointer('VibeLiveTutoring', sessionId));
        payment.set('amount', amount);
        payment.set('status', 'reserved');
        payment.set('reservedAt', new Date());

        await payment.save();
        return payment;
    }

    async endLiveTutoringSession(sessionId) {
        const VibeLiveTutoring = this.app.services.parse.getClass('VibeLiveTutoring');
        const query = new Parse.Query(VibeLiveTutoring);
        const session = await query.get(sessionId);
        
        if (session.get('tutor').id !== this.app.currentUser.id) {
            throw new Error('Only the tutor can end the session');
        }

        session.set('isLive', false);
        session.set('actualEnd', new Date());
        await session.save();

        // Process payments
        await this.processTutoringPayments(sessionId);

        this.app.services.realtime.broadcastUpdate('tutoring_session_ended', {
            sessionId: sessionId,
            tutor: this.app.currentUser.get('username')
        });

        this.app.showSuccess('Tutoring session ended successfully');
        return session;
    }

    async processTutoringPayments(sessionId) {
        const VibeTutoringPayment = this.app.services.parse.getClass('VibeTutoringPayment');
        const query = new Parse.Query(VibeTutoringPayment);
        query.equalTo('session', this.app.services.parse.createPointer('VibeLiveTutoring', sessionId));
        query.equalTo('status', 'reserved');
        
        const payments = await query.find();
        const session = await this.app.services.parse.getClass('VibeLiveTutoring').query().get(sessionId);
        const tutor = session.get('tutor');

        for (const payment of payments) {
            const studentWallet = await this.app.services.wallet.getUserWallet(payment.get('student').id);
            const tutorWallet = await this.app.services.wallet.getUserWallet(tutor.id);

            // Transfer to tutor
            await this.app.services.wallet.createWalletTransaction({
                type: 'credit',
                amount: payment.get('amount'),
                wallet: tutorWallet,
                description: `Tutoring session: ${session.get('title')}`
            });

            // Deduct from student
            await this.app.services.wallet.createWalletTransaction({
                type: 'debit',
                amount: payment.get('amount'),
                wallet: studentWallet,
                description: `Tutoring session: ${session.get('title')}`
            });

            payment.set('status', 'completed');
            payment.set('completedAt', new Date());
            await payment.save();
        }
    }

    async loadCourses(filters = {}) {
        const VibeCourse = this.app.services.parse.getClass('VibeCourse');
        const query = new Parse.Query(VibeCourse);
        
        if (filters.category) {
            query.equalTo('category', filters.category);
        }
        
        if (filters.level) {
            query.equalTo('level', filters.level);
        }
        
        if (filters.priceRange) {
            query.greaterThanOrEqualTo('price', filters.priceRange.min);
            query.lessThanOrEqualTo('price', filters.priceRange.max);
        }
        
        if (filters.instructor) {
            query.equalTo('instructor', filters.instructor);
        }
        
        if (filters.search) {
            query.contains('title', filters.search);
        }
        
        query.include('instructor');
        query.descending('createdAt');
        query.limit(filters.limit || 20);

        try {
            const courses = await query.find();
            this.displayCourses(courses);
            return courses;
        } catch (error) {
            console.error('Error loading courses:', error);
            this.app.showError('Failed to load courses');
            return [];
        }
    }

    async loadMyCourses() {
        const VibeStudentProgress = this.app.services.parse.getClass('VibeStudentProgress');
        const query = new Parse.Query(VibeStudentProgress);
        query.equalTo('student', this.app.currentUser);
        query.include('course');
        query.include('course.instructor');
        query.descending('lastAccessed');

        try {
            const progressRecords = await query.find();
            const courses = progressRecords.map(record => ({
                course: record.get('course'),
                progress: record.get('progressPercentage'),
                lastAccessed: record.get('lastAccessed')
            }));
            
            this.displayMyCourses(courses);
            return courses;
        } catch (error) {
            console.error('Error loading my courses:', error);
            return [];
        }
    }

    async loadLiveTutoringSessions(filters = {}) {
        const VibeLiveTutoring = this.app.services.parse.getClass('VibeLiveTutoring');
        const query = new Parse.Query(VibeLiveTutoring);
        
        query.equalTo('isLive', true);
        
        if (filters.subject) {
            query.equalTo('subject', filters.subject);
        }
        
        if (filters.priceRange) {
            query.greaterThanOrEqualTo('pricePerHour', filters.priceRange.min);
            query.lessThanOrEqualTo('pricePerHour', filters.priceRange.max);
        }
        
        query.include('tutor');
        query.descending('actualStart');
        query.limit(filters.limit || 10);

        try {
            const sessions = await query.find();
            this.displayLiveTutoringSessions(sessions);
            return sessions;
        } catch (error) {
            console.error('Error loading tutoring sessions:', error);
            return [];
        }
    }

    displayCourses(courses) {
        const container = document.getElementById('courses-list');
        if (!container) return;

        container.innerHTML = courses.map(course => `
            <div class="course-card" data-course-id="${course.id}">
                <div class="course-thumbnail">
                    <img src="${course.get('thumbnail')?.url() || '/assets/default-course.jpg'}" alt="${course.get('title')}">
                </div>
                <div class="course-details">
                    <h3 class="course-title">${course.get('title')}</h3>
                    <p class="course-description">${course.get('description')}</p>
                    <div class="course-meta">
                        <div class="course-instructor">By ${course.get('instructor').get('username')}</div>
                        <div class="course-level">${course.get('level')}</div>
                        <div class="course-price">${course.get('price') ? course.get('price') + ' VIBE' : 'Free'}</div>
                    </div>
                    <div class="course-stats">
                        <span>${course.get('enrolledStudents')?.length || 0} students</span>
                        <span>${course.get('modules')?.length || 0} modules</span>
                    </div>
                    <button onclick="vibeApp.services.learning.enrollInCourse('${course.id}')" class="btn-enroll">
                        Enroll Now
                    </button>
                </div>
            </div>
        `).join('');
    }

    displayMyCourses(courses) {
        const container = document.getElementById('my-courses');
        if (!container) return;

        container.innerHTML = courses.map(({course, progress}) => `
            <div class="my-course-card" data-course-id="${course.id}">
                <div class="course-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <span class="progress-text">${Math.round(progress)}% Complete</span>
                </div>
                <div class="course-info">
                    <h4>${course.get('title')}</h4>
                    <p>Instructor: ${course.get('instructor').get('username')}</p>
                    <button onclick="vibeApp.services.learning.continueCourse('${course.id}')" class="btn-continue">
                        Continue Learning
                    </button>
                </div>
            </div>
        `).join('');
    }

    displayLiveTutoringSessions(sessions) {
        const container = document.getElementById('live-tutoring');
        if (!container) return;

        container.innerHTML = sessions.map(session => `
            <div class="tutoring-session-card" data-session-id="${session.id}">
                <div class="session-header">
                    <h3 class="session-title">${session.get('title')}</h3>
                    <div class="live-badge">LIVE</div>
                </div>
                <div class="session-details">
                    <p class="session-subject">${session.get('subject')}</p>
                    <p class="session-tutor">Tutor: ${session.get('tutor').get('username')}</p>
                    <div class="session-meta">
                        <span class="student-count">${session.get('students')?.length || 0} students</span>
                        <span class="session-price">${session.get('pricePerHour')} VIBE/hour</span>
                    </div>
                    <div class="session-actions">
                        <button onclick="vibeApp.services.learning.joinLiveTutoringSession('${session.id}')" class="btn-join">
                            Join Session
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async getLearningAnalytics() {
        const VibeStudentProgress = this.app.services.parse.getClass('VibeStudentProgress');
        const query = new Parse.Query(VibeStudentProgress);
        query.equalTo('student', this.app.currentUser);
        query.include('course');

        const progressRecords = await query.find();
        
        const totalCourses = progressRecords.length;
        const completedCourses = progressRecords.filter(record => record.get('progressPercentage') === 100).length;
        const totalTimeSpent = progressRecords.reduce((sum, record) => sum + (record.get('timeSpent') || 0), 0);
        const averageProgress = progressRecords.reduce((sum, record) => sum + record.get('progressPercentage'), 0) / totalCourses || 0;

        return {
            totalCourses,
            completedCourses,
            inProgressCourses: totalCourses - completedCourses,
            totalTimeSpent: Math.floor(totalTimeSpent / 60), // Convert to hours
            averageProgress: Math.round(averageProgress),
            certificatesEarned: completedCourses
        };
    }

    async createCertificate(courseId) {
        const VibeCourse = this.app.services.parse.getClass('VibeCourse');
        const courseQuery = new Parse.Query(VibeCourse);
        const course = await courseQuery.get(courseId);

        const VibeStudentProgress = this.app.services.parse.getClass('VibeStudentProgress');
        const progressQuery = new Parse.Query(VibeStudentProgress);
        progressQuery.equalTo('student', this.app.currentUser);
        progressQuery.equalTo('course', course);
        const progress = await progressQuery.first();

        if (!progress || progress.get('progressPercentage') < 100) {
            throw new Error('Course not completed');
        }

        const VibeCertificate = this.app.services.parse.getClass('VibeCertificate');
        const certificate = new VibeCertificate();
        
        certificate.set('student', this.app.currentUser);
        certificate.set('course', course);
        certificate.set('courseTitle', course.get('title'));
        certificate.set('instructor', course.get('instructor'));
        certificate.set('completionDate', new Date());
        certificate.set('certificateId', 'CERT_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9));
        certificate.set('verificationUrl', `${window.location.origin}/verify/${certificate.get('certificateId')}`);

        await certificate.save();

        this.app.showSuccess('Certificate generated successfully! 🎓');
        return certificate;
    }

    async rateCourse(courseId, rating, review) {
        const VibeCourseRating = this.app.services.parse.getClass('VibeCourseRating');
        const ratingObj = new VibeCourseRating();
        
        ratingObj.set('student', this.app.currentUser);
        ratingObj.set('course', this.app.services.parse.createPointer('VibeCourse', courseId));
        ratingObj.set('rating', rating);
        ratingObj.set('review', review);
        ratingObj.set('helpful', 0);
        ratingObj.set('verified', true); // Student is enrolled

        await ratingObj.save();

        // Update course average rating
        await this.updateCourseRating(courseId);

        this.app.showSuccess('Thank you for your review!');
        return ratingObj;
    }

    async updateCourseRating(courseId) {
        const VibeCourseRating = this.app.services.parse.getClass('VibeCourseRating');
        const query = new Parse.Query(VibeCourseRating);
        query.equalTo('course', this.app.services.parse.createPointer('VibeCourse', courseId));
        
        const ratings = await query.find();
        const averageRating = ratings.reduce((sum, rating) => sum + rating.get('rating'), 0) / ratings.length;

        const VibeCourse = this.app.services.parse.getClass('VibeCourse');
        const courseQuery = new Parse.Query(VibeCourse);
        const course = await courseQuery.get(courseId);
        
        course.set('averageRating', averageRating);
        course.set('ratingCount', ratings.length);
        await course.save();
    }

    async searchLearningContent(query, filters = {}) {
        const VibeCourse = this.app.services.parse.getClass('VibeCourse');
        const courseQuery = new Parse.Query(VibeCourse);
        
        if (query) {
            const searchFields = ['title', 'description', 'category', 'tags'];
            const orQueries = searchFields.map(field => {
                const fieldQuery = new Parse.Query(VibeCourse);
                fieldQuery.contains(field, query);
                return fieldQuery;
            });
            courseQuery._orQuery(orQueries);
        }
        
        if (filters.category) {
            courseQuery.equalTo('category', filters.category);
        }
        
        if (filters.level) {
            courseQuery.equalTo('level', filters.level);
        }
        
        if (filters.priceMin !== undefined) {
            courseQuery.greaterThanOrEqualTo('price', filters.priceMin);
        }
        
        if (filters.priceMax !== undefined) {
            courseQuery.lessThanOrEqualTo('price', filters.priceMax);
        }
        
        if (filters.rating) {
            courseQuery.greaterThanOrEqualTo('averageRating', filters.rating);
        }
        
        courseQuery.include('instructor');
        courseQuery.descending('createdAt');
        courseQuery.limit(filters.limit || 20);

        try {
            return await courseQuery.find();
        } catch (error) {
            console.error('Error searching learning content:', error);
            return [];
        }
    }
}

export default LearningService;