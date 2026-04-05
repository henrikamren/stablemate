export const mockData = {
  horses: [
    { id: 1, name: 'Atlas', breed: 'Warmblood', age: 8, access: 'barn', owner_id: null, services: {}, notes: '' },
    { id: 2, name: 'Bella', breed: 'Thoroughbred', age: 12, access: 'owner-only', owner_id: 11, services: {}, notes: '' },
    { id: 3, name: 'Clover', breed: 'Welsh Pony', age: 6, access: 'barn', owner_id: null, services: {}, notes: '' },
    { id: 4, name: 'Duke', breed: 'Quarter Horse', age: 10, access: 'owner-allow', owner_id: 11, services: {}, notes: '' }
  ],
  owners: [
    { id: 11, first: 'Olivia', email: 'olivia@test.com', phone: '555-0011', level: 'owner', notes: '' },
    { id: 12, first: 'Marcus', email: 'marcus@test.com', phone: '555-0012', level: 'partial-lease', allowed_days: ['Monday', 'Wednesday'], notes: '' }
  ],
  riders: [
    { id: 101, first: 'Ava', email: 'ava@test.com', phone: '555-0101', level: 'intermediate', parents: 'Jamie', approved_horses: [1, 2] },
    { id: 102, first: 'Mia', email: 'mia@test.com', phone: '555-0102', level: 'beginner', parents: 'Jamie', approved_horses: [3] },
    { id: 103, first: 'Noah', email: 'noah@test.com', phone: '555-0103', level: 'advanced', parents: 'Taylor', approved_horses: [1] },
    { id: 104, first: 'Ella', email: 'ella@test.com', phone: '555-0104', level: 'independent', parents: '', approved_horses: [1, 3] }
  ],
  bookings: [
    {
      id: 501, rider_id: 101, horse_id: 1,
      date: '2026-03-30', time: '08:00', duration: 60,
      type: 'lesson', arena: 'covered', notes: ''
    },
    {
      id: 502, rider_id: 103, horse_id: 3,
      date: '2026-03-30', time: '10:00', duration: 60,
      type: 'lesson', arena: 'covered', notes: ''
    },
    {
      id: 503, rider_id: 101, horse_id: 1,
      date: '2026-04-01', time: '09:00', duration: 45,
      type: 'arena-supervised', arena: 'covered', notes: 'Working on transitions'
    },
    {
      id: 504, rider_id: 102, horse_id: 3,
      date: '2026-04-01', time: '11:00', duration: 60,
      type: 'lesson', arena: 'lunging', notes: ''
    },
    {
      id: 505, rider_id: 104, horse_id: 1,
      date: '2026-04-02', time: '14:00', duration: 60,
      type: 'arena-independent', arena: 'covered', notes: ''
    }
  ],
  trainer_schedules: [
    { id: 9001, trainer_name: 'Megan', day_of_week: 'Monday',    start_time: '08:00', end_time: '12:00' },
    { id: 9002, trainer_name: 'Chris', day_of_week: 'Monday',    start_time: '09:00', end_time: '13:00' },
    { id: 9003, trainer_name: 'Megan', day_of_week: 'Wednesday', start_time: '11:00', end_time: '15:00' },
    { id: 9004, trainer_name: 'Chris', day_of_week: 'Thursday',  start_time: '08:00', end_time: '14:00' }
  ],
  shows: [
    {
      id: 801, name: 'Spring Classic', date: '2026-04-15', end_date: '2026-04-16',
      location: 'Palo Alto', division: 'Hunter 2\'6"',
      horse_ids: [1, 3], rider_ids: [101, 103],
      notes: 'Arrive by 7am', rsvps: {}
    },
    {
      id: 802, name: 'Summer Schooling', date: '2026-05-20', end_date: '',
      location: 'San Jose', division: 'Beginner Walk-Trot',
      horse_ids: [3], rider_ids: [102],
      notes: '', rsvps: {}
    }
  ],
  lunge_requests: [
    { id: 701, rider_id: 101, horse_id: 1, date: '2026-04-02', time: '10:00', status: 'pending', notes: 'Before my lesson', created_at: '2026-03-29T10:00:00Z' },
    { id: 702, rider_id: 103, horse_id: 3, date: '2026-04-03', time: '09:00', status: 'accepted', notes: '', created_at: '2026-03-28T14:00:00Z' }
  ],
  away_from_barn: [
    { id: 601, rider_id: 101, start_date: '2026-04-10', end_date: '2026-04-10', all_day: true, start_time: null, end_time: null, reason: 'Vacation', show_id: null, created_by: 'Megan', created_at: '2026-03-30T10:00:00Z' },
    { id: 602, rider_id: 103, start_date: '2026-04-05', end_date: '2026-04-05', all_day: false, start_time: '09:00', end_time: '12:00', reason: 'Doctor', show_id: null, created_by: 'Megan', created_at: '2026-03-30T10:00:00Z' }
  ],
  horse_unavailable: [
    { id: 651, horse_id: 1, start_date: '2026-04-08', end_date: '2026-04-08', all_day: true, start_time: null, end_time: null, reason: 'Vet visit', created_by: 'Megan', created_at: '2026-03-30T10:00:00Z' },
    { id: 652, horse_id: 3, start_date: '2026-04-06', end_date: '2026-04-06', all_day: false, start_time: '10:00', end_time: '14:00', reason: 'Shoeing', created_by: 'Megan', created_at: '2026-03-30T10:00:00Z' }
  ]
};
