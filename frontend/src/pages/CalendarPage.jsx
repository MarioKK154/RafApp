// frontend/src/pages/CalendarPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US'; // Or your preferred locale
import 'react-big-calendar/lib/css/react-big-calendar.css';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import Select from 'react-select';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from 'react-modal'; // Using react-modal for the event form

// Setup react-modal
Modal.setAppElement('#root'); // Important for accessibility

// Setup the localizer by providing the required date-fns functions
const locales = {
  'en-US': enUS,
};
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

function CalendarPage() {
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();
    const [users, setUsers] = useState([]); // For attendee selection

    // Modal state
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [newEventData, setNewEventData] = useState({
        title: '',
        description: '',
        start: null, // Will be Date objects
        end: null,   // Will be Date objects
        location: '',
        attendee_ids: [],
    });
    const [viewRange, setViewRange] = useState({ start: null, end: null }); // To fetch events for current view

    const canManageEvents = user && ['admin', 'project manager'].includes(user.role);

    // Fetch users for attendee dropdown
    useEffect(() => {
        if (canManageEvents) {
            axiosInstance.get('/users/')
                .then(response => setUsers(response.data.filter(u => u.is_active))) // Only active users
                .catch(() => toast.error("Could not load users for invite list."));
        }
    }, [canManageEvents]);

    // Fetch events based on the current view range
    const fetchEvents = useCallback(async (range) => {
        if (!range || !range.start || !range.end) return;
        setIsLoading(true);
        setError('');
        try {
            const response = await axiosInstance.get('/events/', {
                params: {
                    start: range.start.toISOString(),
                    end: range.end.toISOString(),
                }
            });
            // Convert fetched event times to Date objects for react-big-calendar
            const formattedEvents = response.data.map(event => ({
                ...event,
                start: new Date(event.start_time),
                end: new Date(event.end_time),
                // Add more properties if needed by calendar (like 'allDay')
            }));
            setEvents(formattedEvents);
        } catch (err) {
            setError('Failed to load calendar events.');
            toast.error('Failed to load events.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Effect to fetch events when the view range changes
    useEffect(() => {
        if (viewRange.start && viewRange.end) {
            fetchEvents(viewRange);
        }
    }, [viewRange, fetchEvents]);

    // Handler for when the calendar view changes (e.g., month, week)
    const handleRangeChange = (range) => {
        let start, end;
        if (Array.isArray(range)) { // Week view passes an array of dates
            start = range[0];
            end = range[range.length - 1];
        } else { // Month view passes an object { start: Date, end: Date }
            start = range.start;
            end = range.end;
        }
        // Add buffer if needed, e.g., fetch slightly wider range
        setViewRange({ start, end });
    };

    // Open modal to add event when a slot is selected
    const handleSelectSlot = ({ start, end }) => {
        if (!canManageEvents) return;
        setNewEventData({
            title: '', description: '', start: start, end: end, location: '', attendee_ids: [user.id] // Default include self
        });
        setModalIsOpen(true);
    };

    // Open modal to view/edit event when an event is clicked
    const handleSelectEvent = (event) => {
        // For simplicity, we'll just log the event for now.
        // You could open a different modal here to show details or allow editing/deleting.
        console.log("Selected Event:", event);
        toast.info(`Event: ${event.title}`);
        // To implement editing, you would set modal data based on 'event' and open the modal.
    };

    const closeModal = () => {
        setModalIsOpen(false);
    };

    const handleNewEventChange = (e) => {
        const { name, value } = e.target;
        setNewEventData(prev => ({ ...prev, [name]: value }));
    };

    const handleAttendeeChange = (selectedOptions) => {
        const ids = selectedOptions ? selectedOptions.map(option => option.value) : [];
        // Ensure the current user (creator) is always included if they are managing events
        if (canManageEvents && !ids.includes(user.id)) {
            ids.push(user.id);
        }
        setNewEventData(prev => ({ ...prev, attendee_ids: ids }));
    };

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        // Convert Date objects back to ISO strings for API
        const payload = {
            ...newEventData,
            start_time: newEventData.start.toISOString(),
            end_time: newEventData.end.toISOString(),
        };
        delete payload.start; // Remove Date objects before sending
        delete payload.end;

        try {
            await axiosInstance.post('/events/', payload);
            toast.success('Event created successfully!');
            closeModal();
            fetchEvents(viewRange); // Refresh events
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to create event.');
        }
    };
    
    // Prepare options for react-select
    const userOptions = useMemo(() => users.map(u => ({ value: u.id, label: u.full_name || u.email })), [users]);
    const selectedAttendeeOptions = useMemo(() => 
        newEventData.attendee_ids.map(id => userOptions.find(opt => opt.value === id)).filter(Boolean),
        [newEventData.attendee_ids, userOptions]
    );

    return (
        <div className="container mx-auto p-4 md:p-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-6">Calendar</h1>
            {error && <p className="text-red-500 mb-4">{error}</p>}

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md" style={{ height: '70vh' }}>
                {isLoading && <LoadingSpinner text="Loading events..." />}
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    onRangeChange={handleRangeChange} // Fetch data when view changes
                    selectable={canManageEvents} // Allow selecting slots only if manager/admin
                    onSelectSlot={handleSelectSlot}
                    onSelectEvent={handleSelectEvent}
                    defaultView="month" // Or 'week', 'day', 'agenda'
                />
            </div>

            {/* Event Creation Modal */}
            <Modal
                isOpen={modalIsOpen}
                onRequestClose={closeModal}
                contentLabel="Create New Event"
                className="modal fixed inset-0 flex items-center justify-center p-4 bg-gray-800 bg-opacity-75"
                overlayClassName="modal-overlay fixed inset-0 bg-black bg-opacity-50"
            >
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 w-full max-w-lg">
                    <h2 className="text-xl font-bold mb-4">Create New Event</h2>
                    <form onSubmit={handleCreateEvent} className="space-y-4">
                        <div><label>Title*</label><input type="text" name="title" value={newEventData.title} onChange={handleNewEventChange} required className="mt-1 block w-full rounded-md"/></div>
                        <div><label>Description</label><textarea name="description" value={newEventData.description} onChange={handleNewEventChange} rows="3" className="mt-1 block w-full rounded-md"></textarea></div>
                        <div className="grid grid-cols-2 gap-4">
                            {/* Display selected dates - consider using a date picker library for better UX */}
                            <div><label>Start</label><p className="text-sm p-2 bg-gray-100 rounded">{newEventData.start?.toLocaleString()}</p></div>
                            <div><label>End</label><p className="text-sm p-2 bg-gray-100 rounded">{newEventData.end?.toLocaleString()}</p></div>
                        </div>
                        <div><label>Location</label><input type="text" name="location" value={newEventData.location} onChange={handleNewEventChange} className="mt-1 block w-full rounded-md"/></div>
                        
                        {/* Attendee Selector using react-select */}
                        <div>
                             <label>Attendees</label>
                             <Select
                                isMulti
                                options={userOptions}
                                value={selectedAttendeeOptions}
                                onChange={handleAttendeeChange}
                                className="mt-1 react-select-container"
                                classNamePrefix="react-select"
                             />
                        </div>
                        
                        <div className="flex justify-end space-x-3 pt-4">
                            <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-300 rounded-md">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Create Event</button>
                        </div>
                    </form>
                </div>
            </Modal>
        </div>
    );
}

export default CalendarPage;