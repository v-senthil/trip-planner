import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../utils/api';

const useTripStore = create(
  persist(
    (set, get) => ({
      // Form state
      formData: {
        destination: '',
        destinationCoords: null, // { lat, lng }
        startDate: '',
        endDate: '',
        budget: 'medium',
        vacationType: [],
        customVacationType: '',
        travelPace: 'balanced',
        foodPreference: [],
        transportType: 'cab',
        accommodationArea: '',
        mood: [],
      },

      // Trip state
      itinerary: null,
      isLoading: false,
      loadingMessage: '',
      error: null,

      // Weather
      weather: null,
      weatherAdvice: null,

      // Timezone / time difference
      destTimezone: null,

      // Packing list
      packingList: null,

      // Transport guide
      transportGuide: null,

      // Currency conversion
      convertedCurrency: null, // { code: 'USD', rate: 0.000061, name: 'US Dollar' }

      // Saved trips
      savedTrips: [],

      // View state
      currentView: 'timeline', // 'timeline' | 'map' | 'card'
      selectedDay: 0,

      // --- Actions ---

      updateFormData: (updates) =>
        set((state) => ({
          formData: { ...state.formData, ...updates },
        })),

      resetForm: () =>
        set({
          formData: {
            destination: '',
            destinationCoords: null,
            startDate: '',
            endDate: '',
            budget: 'medium',
            vacationType: [],
            customVacationType: '',
            travelPace: 'balanced',
            foodPreference: [],
            transportType: 'cab',
            accommodationArea: '',
            mood: [],
          },
          itinerary: null,
          error: null,
          weather: null,
          packingList: null,
          transportGuide: null,
          convertedCurrency: null,
        }),

      setView: (view) => set({ currentView: view }),
      setSelectedDay: (day) => set({ selectedDay: day }),
      setConvertedCurrency: (currency) => set({ convertedCurrency: currency }),

      // Generate trip
      generateTrip: async () => {
        const { formData } = get();
        set({ isLoading: true, error: null, loadingMessage: 'AI is crafting your perfect trip...', convertedCurrency: null, destTimezone: null });

        try {
          // Fetch weather in parallel
          set({ loadingMessage: 'Checking weather conditions...' });
          try {
            const weatherRes = await api.get(`/weather/${encodeURIComponent(formData.destination)}`);
            set({ weather: weatherRes.weather, weatherAdvice: weatherRes.advice });
          } catch {
            // Weather is optional
          }

          // Calculate days from dates
          const start = new Date(formData.startDate);
          const end = new Date(formData.endDate);
          const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);

          set({ loadingMessage: 'Planning your day-by-day itinerary...' });
          const res = await api.post('/trips/plan', {
            ...formData,
            days,
          });

          set({
            itinerary: res.itinerary,
            isLoading: false,
            loadingMessage: '',
            selectedDay: 0,
          });

          // Pre-fetch packing list & transport guide in parallel (fire-and-forget)
          const state = get();
          Promise.allSettled([
            state.generatePackingList({ silent: true }),
            state.fetchTransportGuide({ silent: true }),
          ]).catch(() => {});

          // Fetch timezone for time difference display
          if (formData.destinationCoords) {
            api.get('/places/timezone', { lat: formData.destinationCoords.lat, lng: formData.destinationCoords.lng })
              .then((tz) => { if (tz.success) set({ destTimezone: tz }); })
              .catch(() => {});
          }

          return res.itinerary;
        } catch (err) {
          set({
            error: err.message || 'Failed to generate trip',
            isLoading: false,
            loadingMessage: '',
          });
          throw err;
        }
      },

      // Create a manual trip (no AI — just destination, dates, empty days)
      createManualTrip: async () => {
        const { formData } = get();
        set({ isLoading: true, error: null, loadingMessage: 'Setting up your trip...', convertedCurrency: null });

        try {
          // Fetch weather
          set({ loadingMessage: 'Checking weather conditions...' });
          try {
            const weatherRes = await api.get(`/weather/${encodeURIComponent(formData.destination)}`);
            set({ weather: weatherRes.weather, weatherAdvice: weatherRes.advice });
          } catch {
            // Weather is optional
          }

          // Calculate days from dates
          const start = new Date(formData.startDate);
          const end = new Date(formData.endDate);
          const numDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);

          // Build empty itinerary skeleton
          const days = [];
          for (let i = 0; i < numDays; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            days.push({
              day: i + 1,
              date: d.toISOString().split('T')[0],
              theme: `Day ${i + 1}`,
              area: null,
              energyLevel: 'moderate',
              estimatedBudget: { amount: 0, currency: '', breakdown: {} },
              route: null,
              activities: [],
            });
          }

          const tripId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
          const itinerary = {
            id: tripId,
            destination: formData.destination,
            country: null,
            currency: null,
            startDate: formData.startDate,
            endDate: formData.endDate,
            days,
            formData,
          };

          // Save to DB
          set({ loadingMessage: 'Saving trip...' });
          await api.post('/db/trips', { tripId, formData, itinerary });

          set({
            itinerary,
            isLoading: false,
            loadingMessage: '',
            selectedDay: 0,
          });

          // Pre-fetch packing list & transport guide in parallel
          const state = get();
          Promise.allSettled([
            state.generatePackingList({ silent: true }),
            state.fetchTransportGuide({ silent: true }),
          ]).catch(() => {});

          return itinerary;
        } catch (err) {
          set({
            error: err.message || 'Failed to create trip',
            isLoading: false,
            loadingMessage: '',
          });
          throw err;
        }
      },

      // Regenerate a single day
      regenerateDay: async (dayNumber) => {
        const { itinerary, formData } = get();
        set({ isLoading: true, loadingMessage: `Regenerating Day ${dayNumber}...` });

        try {
          const res = await api.post('/trips/regenerate-day', {
            destination: formData.destination,
            dayNumber,
            existingDays: itinerary?.days || [],
            preferences: formData,
          });

          const updatedDays = [...(itinerary?.days || [])];
          const idx = updatedDays.findIndex((d) => d.day === dayNumber);
          if (idx >= 0) {
            updatedDays[idx] = { ...res.day, day: dayNumber };
          }

          set({
            itinerary: { ...itinerary, days: updatedDays },
            isLoading: false,
            loadingMessage: '',
          });

          // Persist regenerated day to DB
          get().persistToDb();
        } catch (err) {
          set({ error: err.message, isLoading: false, loadingMessage: '' });
        }
      },

      // Swap an attraction
      swapAttraction: async (dayNumber, activityIndex) => {
        const { itinerary, formData } = get();
        const day = itinerary?.days?.find((d) => d.day === dayNumber);
        const activity = day?.activities?.[activityIndex];
        if (!activity) return;

        set({ isLoading: true, loadingMessage: 'Finding an alternative...' });

        try {
          const res = await api.post('/trips/swap-attraction', {
            destination: formData.destination,
            currentPlace: activity.name,
            slot: activity.slot,
            vacationType: formData.vacationType,
            budget: formData.budget,
          });

          const updatedDays = itinerary.days.map((d) => {
            if (d.day !== dayNumber) return d;
            const updatedActivities = [...d.activities];
            updatedActivities[activityIndex] = {
              ...updatedActivities[activityIndex],
              ...res.alternative,
              swapped: true,
            };
            return { ...d, activities: updatedActivities };
          });

          set({
            itinerary: { ...itinerary, days: updatedDays },
            isLoading: false,
            loadingMessage: '',
          });

          // Persist swapped activity to DB
          get().persistToDb();
        } catch (err) {
          set({ error: err.message, isLoading: false, loadingMessage: '' });
        }
      },

      // Update activity (inline edit) — persists to DB
      updateActivity: (dayNumber, activityIndex, updates) => {
        const { itinerary } = get();
        if (!itinerary) return;

        const day = itinerary.days.find((d) => d.day === dayNumber);
        const activity = day?.activities?.[activityIndex];

        const updatedDays = itinerary.days.map((d) => {
          if (d.day !== dayNumber) return d;
          const updatedActivities = [...d.activities];
          updatedActivities[activityIndex] = {
            ...updatedActivities[activityIndex],
            ...updates,
          };
          return { ...d, activities: updatedActivities };
        });

        set({ itinerary: { ...itinerary, days: updatedDays } });

        // Debounced DB persist
        if (itinerary.id && activity?.id) {
          clearTimeout(window.__updateActivityTimer);
          window.__updateActivityTimer = setTimeout(() => {
            const curr = get().itinerary?.days?.find((d) => d.day === dayNumber)?.activities?.[activityIndex];
            if (curr?.id) {
              api.patch(`/db/trips/${get().itinerary.id}/activities/${curr.id}`, {
                name: curr.name,
                type: curr.type,
                description: curr.description,
                budgetEstimate: curr.budgetEstimate,
                tips: curr.tips,
                timeStart: curr.timeStart,
                timeEnd: curr.timeEnd,
                estimatedMinutes: curr.estimatedMinutes,
              }).catch(() => {});
            }
          }, 800);
        }
      },

      // Optimize route for a day
      optimizeRoute: async (dayNumber) => {
        const { itinerary } = get();
        const day = itinerary?.days?.find((d) => d.day === dayNumber);
        if (!day) return;

        const waypoints = day.activities
          .filter((a) => a.coordinates)
          .map((a) => a.coordinates);

        if (waypoints.length < 3) return;

        set({ isLoading: true, loadingMessage: 'Optimizing route...' });

        try {
          const res = await api.post('/trips/optimize-route', { waypoints });

          // Reorder activities based on optimized waypoints
          // This is a simplified version — in production, match by coordinates
          set({ isLoading: false, loadingMessage: '' });
        } catch (err) {
          set({ error: err.message, isLoading: false, loadingMessage: '' });
        }
      },

      // Generate packing list
      generatePackingList: async ({ silent } = {}) => {
        const { formData, weather, itinerary, packingList: existing } = get();
        // Skip AI call if we already have a packing list (loaded from DB)
        if (existing && silent) return;
        if (!silent) set({ isLoading: true, loadingMessage: 'Creating your packing list...' });

        try {
          const res = await api.post('/trips/packing-list', {
            ...formData,
            weather: weather?.current,
          });
          set(silent ? { packingList: res.packingList } : { packingList: res.packingList, isLoading: false, loadingMessage: '' });
          // Persist to DB
          if (itinerary?.id && res.packingList) {
            api.post(`/db/trips/${itinerary.id}/packing-list`, { packingList: res.packingList }).catch(() => {});
          }
        } catch (err) {
          if (!silent) set({ error: err.message, isLoading: false, loadingMessage: '' });
        }
      },

      // Get transport guide
      fetchTransportGuide: async ({ silent } = {}) => {
        const { formData, itinerary, transportGuide: existing } = get();
        // Skip AI call if we already have a transport guide (loaded from DB)
        if (existing && silent) return;
        if (!silent) set({ isLoading: true, loadingMessage: 'Fetching transport info...' });

        try {
          const res = await api.post('/trips/transport-guide', {
            destination: formData.destination,
          });
          set(silent ? { transportGuide: res.guide } : { transportGuide: res.guide, isLoading: false, loadingMessage: '' });
          // Persist to DB
          if (itinerary?.id && res.guide) {
            api.post(`/db/trips/${itinerary.id}/transport-guide`, { guide: res.guide }).catch(() => {});
          }
        } catch (err) {
          if (!silent) set({ error: err.message, isLoading: false, loadingMessage: '' });
        }
      },

      // Download PDF
      downloadPDF: async () => {
        const { itinerary } = get();
        if (!itinerary) return;

        try {
          const response = await fetch('/api/trips/pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itinerary }),
          });

          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `trip-${itinerary.destination || 'plan'}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        } catch (err) {
          set({ error: 'Failed to download PDF' });
        }
      },

      // Save trip (to DB)
      saveTrip: async () => {
        const { itinerary, formData, packingList, transportGuide } = get();
        if (!itinerary) return;

        const tripId = itinerary.id || Date.now().toString();
        try {
          await api.post('/db/trips', { tripId, formData, itinerary });

          // Also persist packing list and transport guide if we have them
          if (packingList) {
            api.post(`/db/trips/${tripId}/packing-list`, { packingList }).catch(() => {});
          }
          if (transportGuide) {
            api.post(`/db/trips/${tripId}/transport-guide`, { guide: transportGuide }).catch(() => {});
          }

          // Refresh saved trips list from DB
          const listRes = await api.get('/db/trips');
          set({ savedTrips: listRes.trips || [] });
        } catch (err) {
          set({ error: err.message || 'Failed to save trip' });
        }
      },

      // Load trip (from DB)
      loadTrip: async (tripId) => {
        try {
          const res = await api.get(`/db/trips/${tripId}`);
          if (res.trip) {
            set({
              formData: res.trip.formData || get().formData,
              itinerary: res.trip,
              destTimezone: null, // Reset while loading
            });

            const destination = res.trip.destination || res.trip.formData?.destination;

            // Fetch weather, timezone in parallel (all optional)
            if (destination) {
              const tasks = [];

              // Weather
              tasks.push(
                api.get(`/weather/${encodeURIComponent(destination)}`)
                  .then((wr) => set({ weather: wr.weather, weatherAdvice: wr.advice }))
                  .catch(() => {}) // Weather is optional
              );

              // Geocode → timezone
              tasks.push(
                api.get('/places/geocode', { q: destination })
                  .then(async (geo) => {
                    const first = geo.results?.[0];
                    if (first?.lat && first?.lng) {
                      const tz = await api.get('/places/timezone', { lat: first.lat, lng: first.lng });
                      if (tz.success) {
                        set({ destTimezone: tz });
                        set((s) => ({
                          formData: { ...s.formData, destinationCoords: { lat: first.lat, lng: first.lng } },
                        }));
                      }
                    }
                  })
                  .catch(() => {}) // Timezone is optional
              );

              await Promise.allSettled(tasks);
            }

            // Load packing list & transport guide from DB
            try {
              const [packRes, transRes] = await Promise.all([
                api.get(`/db/trips/${tripId}/packing-list`),
                api.get(`/db/trips/${tripId}/transport-guide`),
              ]);
              if (packRes.packingList) set({ packingList: packRes.packingList });
              if (transRes.guide) set({ transportGuide: transRes.guide });
            } catch {
              // Optional — don't block trip load
            }
          }
        } catch (err) {
          set({ error: err.message || 'Failed to load trip' });
        }
      },

      // Fetch all saved trips from DB
      fetchSavedTrips: async () => {
        try {
          const res = await api.get('/db/trips');
          set({ savedTrips: res.trips || [] });
        } catch {
          // silent
        }
      },

      // Delete saved trip (from DB)
      deleteSavedTrip: async (tripId) => {
        try {
          await api.delete(`/db/trips/${tripId}`);
          const res = await api.get('/db/trips');
          set({ savedTrips: res.trips || [] });
        } catch (err) {
          set({ error: err.message });
        }
      },

      // ─── Add / Remove Activity ──────────────────────────────────────
      addActivity: async (dayNumber, activity, insertAtIndex) => {
        const { itinerary } = get();
        if (!itinerary?.id) return;

        try {
          const res = await api.post(
            `/db/trips/${itinerary.id}/days/${dayNumber}/activities`,
            { ...activity, insertAtIndex: insertAtIndex != null ? insertAtIndex : undefined }
          );

          // Update local state
          const updatedDays = itinerary.days.map((d) => {
            if (d.day !== dayNumber) return d;
            const acts = [...(d.activities || [])];
            const newAct = { ...res.activity, customAdded: true };
            if (insertAtIndex != null && insertAtIndex >= 0 && insertAtIndex <= acts.length) {
              acts.splice(insertAtIndex, 0, newAct);
            } else {
              acts.push(newAct);
            }
            return { ...d, activities: acts };
          });

          set({ itinerary: { ...itinerary, days: updatedDays } });
          return true;
        } catch (err) {
          set({ error: err.message || 'Failed to add place' });
          return false;
        }
      },

      removeActivity: async (dayNumber, activityIndex) => {
        const { itinerary } = get();
        if (!itinerary) return;

        const day = itinerary.days.find((d) => d.day === dayNumber);
        const activity = day?.activities?.[activityIndex];

        // Remove from DB if trip is saved and activity has an id
        if (itinerary.id && activity?.id) {
          try {
            await api.delete(`/db/trips/${itinerary.id}/activities/${activity.id}`);
          } catch {
            // continue with local removal
          }
        }

        // Remove from local state
        const updatedDays = itinerary.days.map((d) => {
          if (d.day !== dayNumber) return d;
          const updatedActivities = [...d.activities];
          updatedActivities.splice(activityIndex, 1);
          return { ...d, activities: updatedActivities };
        });

        set({ itinerary: { ...itinerary, days: updatedDays } });
      },

      // ─── Update Activity Coordinates ────────────────────────────────

      /**
       * Manually set coordinates for an activity.
       */
      updateActivityCoordinates: async (dayNumber, activityIndex, lat, lng) => {
        const { itinerary } = get();
        if (!itinerary) return;

        const day = itinerary.days.find((d) => d.day === dayNumber);
        const activity = day?.activities?.[activityIndex];
        if (!activity) return;

        // Persist to DB if possible
        if (itinerary.id && activity.id) {
          try {
            await api.patch(
              `/db/trips/${itinerary.id}/activities/${activity.id}/coordinates`,
              { lat, lng }
            );
          } catch {
            // continue with local update
          }
        }

        // Update local state
        const updatedDays = itinerary.days.map((d) => {
          if (d.day !== dayNumber) return d;
          const updatedActivities = [...d.activities];
          updatedActivities[activityIndex] = {
            ...updatedActivities[activityIndex],
            coordinates: { lat, lng },
            geocoded: true,
            approximate: false,
          };
          return { ...d, activities: updatedActivities };
        });

        set({ itinerary: { ...itinerary, days: updatedDays } });
      },

      /**
       * Re-geocode an activity by search query.
       */
      reGeocodeActivity: async (dayNumber, activityIndex, searchQuery) => {
        const { itinerary } = get();
        if (!itinerary) return { success: false, message: 'No itinerary' };

        const day = itinerary.days.find((d) => d.day === dayNumber);
        const activity = day?.activities?.[activityIndex];
        if (!activity) return { success: false, message: 'Activity not found' };

        // Try geocoding via server
        if (itinerary.id && activity.id) {
          try {
            const res = await api.post(
              `/db/trips/${itinerary.id}/activities/${activity.id}/geocode`,
              { searchQuery }
            );

            if (res.success && res.coordinates) {
              // Update local state
              const updatedDays = itinerary.days.map((d) => {
                if (d.day !== dayNumber) return d;
                const updatedActivities = [...d.activities];
                updatedActivities[activityIndex] = {
                  ...updatedActivities[activityIndex],
                  coordinates: res.coordinates,
                  geocoded: true,
                  approximate: false,
                };
                return { ...d, activities: updatedActivities };
              });
              set({ itinerary: { ...itinerary, days: updatedDays } });
              return { success: true };
            } else {
              return { success: false, message: res.message || 'Location not found' };
            }
          } catch (err) {
            return { success: false, message: err.message || 'Geocoding failed' };
          }
        }

        return { success: false, message: 'Trip not saved — save first' };
      },

      // ─── Add / Remove Day ───────────────────────────────────────────
      addDay: async () => {
        const { itinerary } = get();
        if (!itinerary) return;

        // Calculate the next date
        const lastDay = itinerary.days?.[itinerary.days.length - 1];
        let nextDate = null;
        if (lastDay?.date) {
          const d = new Date(lastDay.date + 'T00:00:00');
          d.setDate(d.getDate() + 1);
          nextDate = d.toISOString().split('T')[0];
        }

        if (itinerary.id) {
          try {
            const res = await api.post(`/db/trips/${itinerary.id}/days`, { date: nextDate });
            const newDay = res.day;
            newDay.activities = newDay.activities || [];

            const updatedDays = [...itinerary.days, newDay];
            const updatedItinerary = { ...itinerary, days: updatedDays };
            if (nextDate) updatedItinerary.endDate = nextDate;

            set({ itinerary: updatedItinerary });
            return;
          } catch {
            // fall through to local-only
          }
        }

        // Local-only fallback
        const newDayNum = (itinerary.days?.length || 0) + 1;
        const newDay = {
          day: newDayNum,
          date: nextDate,
          theme: `Day ${newDayNum}`,
          area: null,
          energyLevel: 'moderate',
          estimatedBudget: { amount: 0, currency: itinerary.currency || '', breakdown: {} },
          route: null,
          activities: [],
        };

        const updatedDays = [...itinerary.days, newDay];
        const updatedItinerary = { ...itinerary, days: updatedDays };
        if (nextDate) updatedItinerary.endDate = nextDate;

        set({ itinerary: updatedItinerary });
      },

      removeDay: async (dayNumber) => {
        const { itinerary } = get();
        if (!itinerary || !itinerary.days || itinerary.days.length <= 1) return;

        if (itinerary.id) {
          try {
            const res = await api.delete(`/db/trips/${itinerary.id}/days/${dayNumber}`);
            if (res.itinerary) {
              set({ itinerary: res.itinerary, selectedDay: 0 });
              return;
            }
          } catch {
            // fall through to local
          }
        }

        // Local-only fallback: remove day and renumber
        const filtered = itinerary.days
          .filter((d) => d.day !== dayNumber)
          .map((d, idx) => ({ ...d, day: idx + 1 }));

        set({ itinerary: { ...itinerary, days: filtered }, selectedDay: 0 });
      },

      // ─── Persist itinerary to DB (after any local change) ───────────
      persistToDb: async () => {
        const { itinerary, formData, packingList, transportGuide } = get();
        if (!itinerary?.id) return;
        try {
          await api.post('/db/trips', { tripId: itinerary.id, formData, itinerary });
          if (packingList) {
            api.post(`/db/trips/${itinerary.id}/packing-list`, { packingList }).catch(() => {});
          }
          if (transportGuide) {
            api.post(`/db/trips/${itinerary.id}/transport-guide`, { guide: transportGuide }).catch(() => {});
          }
        } catch {
          // silent
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'tripplanner-storage',
      partialize: (state) => ({
        savedTrips: state.savedTrips,
        formData: state.formData,
      }),
    }
  )
);

export default useTripStore;
