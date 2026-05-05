class LearningService {
    constructor(app) { this.app = app; }

    async createCourse(data) {
        const Course = Parse.Object.extend('VibeCourse');
        const c = new Course();
        c.set('instructor', this.app.currentUser);
        c.set('title', data.title);
        c.set('description', data.description);
        c.set('price', data.price || 0);
        c.set('modules', []);
        await c.save();
        showNotification('Course created');
        await this.loadCourses();
    }

    async loadCourses() {
        const q = new Parse.Query('VibeCourse').include('instructor');
        const courses = await q.find();
        const container = document.getElementById('courses-list');
        if (container) {
            container.innerHTML = courses.map(c => `<div class="card"><h4>${c.get('title')}</h4><p>${c.get('price')} VIBE</p><button data-id="${c.id}" class="enroll-btn">Enroll</button></div>`).join('');
            container.querySelectorAll('.enroll-btn').forEach(b => b.onclick = () => this.enroll(b.dataset.id));
        }
    }

    async enroll(courseId) {
        const c = await new Parse.Query('VibeCourse').get(courseId);
        c.addUnique('enrolledStudents', this.app.currentUser);
        await c.save();
        showNotification('Enrolled');
    }

    async createQuiz(data) {
        const Quiz = Parse.Object.extend('VibeQuiz');
        const q = new Quiz();
        q.set('title', data.title);
        q.set('questions', data.questions);
        q.set('course', { __type:'Pointer', className:'VibeCourse', objectId: data.courseId });
        await q.save();
        showNotification('Quiz created');
    }
}
window.LearningService = LearningService;