export const mockData = {
  horses: [
    { id: 1, name: 'Atlas', access: 'barn', owner_id: null },
    { id: 2, name: 'Bella', access: 'owner-only', owner_id: 11 },
    { id: 3, name: 'Clover', access: 'barn', owner_id: null }
  ],
  owners: [
    { id: 11, first: 'Olivia' }
  ],
  riders: [
    { id: 101, first: 'Ava', parents: 'Jamie', approved_horses: [1, 2] },
    { id: 102, first: 'Mia', parents: 'Jamie', approved_horses: [3] },
    { id: 103, first: 'Noah', parents: 'Taylor', approved_horses: [1] }
  ],
  bookings: [
    {
      id: 501,
      rider_id: 101,
      horse_id: 1,
      date: '2026-03-30',
      time: '08:00',
      duration: 60,
      type: 'lesson',
      arena: 'main'
    },
    {
      id: 502,
      rider_id: 103,
      horse_id: 3,
      date: '2026-03-30',
      time: '10:00',
      duration: 60,
      type: 'lesson',
      arena: 'indoor'
    }
  ],
  trainer_schedules: [
    { id: 9001, trainer_name: 'Megan', day_of_week: 'Monday',    start_time: '08:00', end_time: '12:00' },
    { id: 9002, trainer_name: 'Chris', day_of_week: 'Monday',    start_time: '09:00', end_time: '13:00' },
    { id: 9003, trainer_name: 'Megan', day_of_week: 'Wednesday', start_time: '11:00', end_time: '15:00' }
  ],
  shows: [],
  lunge_requests: []
};
