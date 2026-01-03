// src/learning/VibeCourse.js
class VibeCourse {
    static getSchema() {
        return {
            className: 'VibeCourse',
            fields: {
                instructor: { type: 'Pointer', targetClass: '_User', required: true },
                title: { type: 'String', required: true },
                description: { type: 'String' },
                category: { type: 'String', required: true },
                price: { type: 'Number', default: 0 },
                level: { type: 'String', default: 'beginner' },
                modules: { type: 'Array', default: [] },
                enrolledStudents: { type: 'Relation', targetClass: '_User' },
                thumbnail: { type: 'File' },
                objectives: { type: 'Array', default: [] },
                requirements: { type: 'Array', default: [] },
                tags: { type: 'Array', default: [] },
                averageRating: { type: 'Number', default: 0 },
                ratingCount: { type: 'Number', default: 0 }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('VibeCourse');
    }
}

// src/learning/VibeStudentProgress.js
class VibeStudentProgress {
    static getSchema() {
        return {
            className: 'VibeStudentProgress',
            fields: {
                student: { type: 'Pointer', targetClass: '_User', required: true },
                course: { type: 'Pointer', targetClass: 'VibeCourse', required: true },
                completedModules: { type: 'Array', default: [] },
                currentModule: { type: 'Number', default: 0 },
                progressPercentage: { type: 'Number', default: 0 },
                quizScores: { type: 'Object', default: {} },
                timeSpent: { type: 'Number', default: 0 },
                lastAccessed: { type: 'Date' }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('VibeStudentProgress');
    }
}

// src/learning/VibeQuiz.js
class VibeQuiz {
    static getSchema() {
        return {
            className: 'VibeQuiz',
            fields: {
                title: { type: 'String', required: true },
                description: { type: 'String' },
                questions: { type: 'Array', required: true },
                timeLimit: { type: 'Number' },
                passingScore: { type: 'Number', default: 70 },
                maxAttempts: { type: 'Number', default: 3 },
                course: { type: 'Pointer', targetClass: 'VibeCourse' },
                tags: { type: 'Array', default: [] }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('VibeQuiz');
    }
}

// src/learning/VibeLiveTutoring.js
class VibeLiveTutoring {
    static getSchema() {
        return {
            className: 'VibeLiveTutoring',
            fields: {
                tutor: { type: 'Pointer', targetClass: '_User', required: true },
                title: { type: 'String', required: true },
                subject: { type: 'String', required: true },
                description: { type: 'String' },
                pricePerHour: { type: 'Number', default: 0 },
                maxStudents: { type: 'Number', default: 10 },
                students: { type: 'Array', default: [] },
                isLive: { type: 'Boolean', default: false },
                whiteboardData: { type: 'Object', default: {} },
                resources: { type: 'Array', default: [] },
                chatRoom: { type: 'Pointer', targetClass: 'Message' },
                scheduledStart: { type: 'Date' },
                actualStart: { type: 'Date' },
                actualEnd: { type: 'Date' }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('VibeLiveTutoring');
    }
}