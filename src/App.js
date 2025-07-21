import React, { useState, useEffect } from 'react';
import { auth, db, storage } from './firebase';
import { 
  GoogleAuthProvider,
  signInWithPopup,
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  orderBy,
  query
} from 'firebase/firestore';
import { 
  ref, 
  uploadString, 
  getDownloadURL 
} from 'firebase/storage';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [calendarUrl, setCalendarUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [formData, setFormData] = useState({
    songTitle: '',
    story: '',
    spotifyLink: '',
    youtubeLink: '',
    scheduledDate: ''
  });

  const ADMIN_EMAIL = 'chris@heroiccontent.com';
  const provider = new GoogleAuthProvider();

  // Check for admin mode on page load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setIsAdminMode(urlParams.get('admin') === 'true');
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      if (user && user.email === ADMIN_EMAIL && isAdminMode) {
        loadRecommendations();
      } else if (user && user.email !== ADMIN_EMAIL && isAdminMode) {
        signOut(auth);
        alert('Access denied. Admin only.');
      } else {
        loadPublicRecommendations();
      }
    });
    return unsubscribe;
  }, [isAdminMode]);

  // Load all recommendations (admin view)
  const loadRecommendations = async () => {
    try {
      const q = query(collection(db, 'recommendations'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const recs = [];
      querySnapshot.forEach((doc) => {
        recs.push({ id: doc.id, ...doc.data() });
      });
      setRecommendations(recs);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    }
  };

  // Load public recommendations (only past ones)
  const loadPublicRecommendations = async () => {
    try {
      const q = query(collection(db, 'recommendations'), orderBy('scheduledDate', 'desc'));
      const querySnapshot = await getDocs(q);
      const recs = [];
      querySnapshot.forEach((doc) => {
        recs.push({ id: doc.id, ...doc.data() });
      });
      setRecommendations(recs);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    }
  };

  // Load existing calendar URL
  useEffect(() => {
    const loadCalendarUrl = async () => {
      try {
        const calendarRef = ref(storage, 'calendar/soundstories.ics');
        const downloadURL = await getDownloadURL(calendarRef);
        const webcalURL = downloadURL.replace('https://', 'webcal://');
        setCalendarUrl(webcalURL);
      } catch (error) {
        // Calendar doesn't exist yet
        console.log('No calendar found yet');
      }
    };
    loadCalendarUrl();
  }, []);

  // Generate ICS content
  const generateICSContent = () => {
    const formatDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const escapeText = (text) => {
      return text.replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    };

    const header = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//SoundStories//Music Recommendations//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:SoundStories - Weekly Music Recommendations
X-WR-CALDESC:Curated music recommendations with stories
REFRESH-INTERVAL;VALUE=DURATION:PT4H
X-PUBLISHED-TTL:PT4H`;

    const events = recommendations.map(rec => {
      const startDate = new Date(rec.scheduledDate);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

      let description = escapeText(rec.story) + '\\n\\n🎵 Listen Now:\\n';
      
      if (rec.spotifyLink) {
        description += `🎧 Spotify: ${rec.spotifyLink}\\n`;
      }
      if (rec.youtubeLink) {
        description += `📺 YouTube: ${rec.youtubeLink}\\n`;
      }
      
      description += '\\n📅 Weekly music recommendations from SoundStories';

      return `BEGIN:VEVENT
UID:soundstories-${rec.id}@soundstories.app
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:🎵 ${escapeText(rec.songTitle)}
DESCRIPTION:${description}
LOCATION:Your favorite music app
STATUS:CONFIRMED
CATEGORIES:Music,Entertainment,SoundStories
END:VEVENT`;
    }).join('\n');

    const footer = `END:VCALENDAR`;
    return `${header}\n${events}\n${footer}`;
  };

  // Upload calendar to Firebase Storage
  const generateCalendar = async () => {
    if (recommendations.length === 0) {
      alert('Add recommendations first');
      return;
    }

    setIsGenerating(true);
    
    try {
      const icsContent = generateICSContent();
      
      const calendarRef = ref(storage, 'calendar/soundstories.ics');
      await uploadString(calendarRef, icsContent, 'raw');
      
      const downloadURL = await getDownloadURL(calendarRef);
      const webcalURL = downloadURL.replace('https://', 'webcal://');
      
      setCalendarUrl(webcalURL);
      
      alert(`🎉 Calendar updated! ${recommendations.length} recommendations now available for subscription.`);
    } catch (error) {
      console.error('Error generating calendar:', error);
      alert('Error generating calendar: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Google Sign-In
  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      alert('Sign-in failed: ' + error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      alert(error.message);
    }
  };

  // Add recommendation to Firestore
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.songTitle || !formData.story || !formData.scheduledDate) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const newRec = {
        ...formData,
        adminEmail: user.email,
        adminName: user.displayName,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'recommendations'), newRec);
      
      setFormData({
        songTitle: '',
        story: '',
        spotifyLink: '',
        youtubeLink: '',
        scheduledDate: ''
      });
      
      loadRecommendations();
      alert('Recommendation added! Remember to update the calendar.');
    } catch (error) {
      alert('Error adding recommendation: ' + error.message);
    }
  };

  // Delete recommendation
  const deleteRec = async (id, title) => {
    if (window.confirm(`Delete "${title}"?`)) {
      try {
        await deleteDoc(doc(db, 'recommendations', id));
        loadRecommendations();
        alert('Deleted! Remember to update the calendar.');
      } catch (error) {
        alert('Error deleting: ' + error.message);
      }
    }
  };

  // Split by date
  const now = new Date();
  const upcoming = recommendations.filter(r => new Date(r.scheduledDate) > now);
  const past = recommendations.filter(r => new Date(r.scheduledDate) <= now).slice(0, 20);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white', fontSize: '1.5rem' }}>🎵 Loading SoundStories...</div>
      </div>
    );
  }

  // PUBLIC HOMEPAGE
  if (!isAdminMode) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          {/* Public Header */}
<header style={{ textAlign: 'center', color: 'white', marginBottom: '60px', padding: '40px 0', position: 'relative' }}>
  {/* Admin Button - Top Right */}
  <a 
    href="/?admin=true"
    style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      background: 'rgba(255,255,255,0.2)',
      color: 'white',
      padding: '8px 16px',
      borderRadius: '20px',
      textDecoration: 'none',
      fontSize: '14px',
      fontWeight: '600',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.3)',
      transition: 'all 0.3s ease'
    }}
    onMouseEnter={(e) => {
      e.target.style.background = 'rgba(255,255,255,0.3)';
      e.target.style.transform = 'translateY(-2px)';
    }}
    onMouseLeave={(e) => {
      e.target.style.background = 'rgba(255,255,255,0.2)';
      e.target.style.transform = 'translateY(0)';
    }}
  >
    🔐 Admin
  </a>

  <h1 style={{ fontSize: '4rem', marginBottom: '20px', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>🎵 SoundStories</h1>
  <p style={{ fontSize: '1.5rem', opacity: 0.9, marginBottom: '10px' }}>
    Curated music recommendations with stories
  </p>
  <p style={{ fontSize: '1.1rem', opacity: 0.8, maxWidth: '600px', margin: '0 auto' }}>
    Discover new music every week through your calendar. Each recommendation comes with the story behind the song.
  </p>
</header>

    
          {/* Subscribe Section */}
<div style={{ background: 'white', borderRadius: '20px', padding: '40px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', marginBottom: '40px' }}>
  <h2 style={{ marginBottom: '30px', color: '#4a5568', textAlign: 'center', fontSize: '2rem' }}>📅 Subscribe to Weekly Recommendations</h2>
  
  {calendarUrl ? (
    <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '30px', borderRadius: '15px', marginBottom: '30px' }}>
      <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>🎵 One-Click Subscribe</h3>
      <p style={{ marginBottom: '25px', opacity: 0.9, textAlign: 'center' }}>
        Choose your calendar app for instant subscription:
      </p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
        <a 
          href={`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(calendarUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ 
            background: '#4285f4', 
            color: 'white', 
            padding: '15px 20px', 
            borderRadius: '10px', 
            textDecoration: 'none', 
            textAlign: 'center',
            fontWeight: '600',
            fontSize: '16px',
            display: 'block'
          }}
        >
          📅 Google Calendar
        </a>
        
        <a 
          href={`https://outlook.live.com/calendar/0/addcalendar?url=${encodeURIComponent(calendarUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ 
            background: '#0078d4', 
            color: 'white', 
            padding: '15px 20px', 
            borderRadius: '10px', 
            textDecoration: 'none', 
            textAlign: 'center',
            fontWeight: '600',
            fontSize: '16px',
            display: 'block'
          }}
        >
          📧 Outlook
        </a>
        
        <a 
          href={calendarUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ 
            background: '#000000', 
            color: 'white', 
            padding: '15px 20px', 
            borderRadius: '10px', 
            textDecoration: 'none', 
            textAlign: 'center',
            fontWeight: '600',
            fontSize: '16px',
            display: 'block'
          }}
        >
          🍎 Apple Calendar
        </a>
        
        <button 
          onClick={() => {
            navigator.clipboard.writeText(calendarUrl);
            alert('Calendar URL copied to clipboard!');
          }}
          style={{ 
            background: '#48bb78', 
            color: 'white', 
            padding: '15px 20px', 
            border: 'none',
            borderRadius: '10px', 
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '16px'
          }}
        >
          📋 Copy URL
        </button>
      </div>
    </div>
  ) : (
    <div style={{ background: '#f8fafc', padding: '30px', borderRadius: '15px', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🎵</div>
      <h3 style={{ color: '#4a5568', marginBottom: '15px' }}>Coming Soon!</h3>
      <p style={{ color: '#718096', marginBottom: '20px' }}>
        We're preparing amazing music recommendations for you. Check back soon for subscription links!
      </p>
      <div style={{ background: '#667eea', color: 'white', padding: '15px', borderRadius: '10px', fontSize: '14px' }}>
        💡 <strong>Want to be notified when it's ready?</strong><br/>
        Bookmark this page and check back in a few days.
      </div>
    </div>
  )}
</div>

          {/* Recent Recommendations */}
          <div style={{ background: 'white', borderRadius: '20px', padding: '40px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginBottom: '30px', color: '#4a5568', textAlign: 'center', fontSize: '2rem' }}>🎶 Recent Recommendations</h2>
            
            {past.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#718096', fontStyle: 'italic', fontSize: '18px' }}>
                New recommendations coming soon! Subscribe to be the first to know.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: '30px' }}>
                {past.slice(0, 6).map(rec => (
                  <div key={rec.id} style={{ border: '2px solid #e2e8f0', borderRadius: '20px', padding: '30px', background: '#f8fafc', transition: 'all 0.3s ease' }}>
                    <div style={{ marginBottom: '20px' }}>
                      <h3 style={{ color: '#2d3748', margin: '0 0 10px 0', fontSize: '1.5rem' }}>{rec.songTitle}</h3>
                      <small style={{ color: '#718096', fontSize: '14px' }}>
                        {new Date(rec.scheduledDate).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </small>
                    </div>
                    
                    <p style={{ marginBottom: '20px', color: '#4a5568', lineHeight: '1.7', fontSize: '16px' }}>
                      {rec.story}
                    </p>
                    
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                      {rec.spotifyLink && (
                        <a 
                          href={rec.spotifyLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{
                            background: '#1db954',
                            color: 'white',
                            padding: '10px 20px',
                            borderRadius: '25px',
                            textDecoration: 'none',
                            fontSize: '14px',
                            fontWeight: '600',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                          onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                          🎧 Listen on Spotify
                        </a>
                      )}
                      
                      {rec.youtubeLink && (
                        <a 
                          href={rec.youtubeLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{
                            background: '#ff0000',
                            color: 'white',
                            padding: '10px 20px',
                            borderRadius: '25px',
                            textDecoration: 'none',
                            fontSize: '14px',
                            fontWeight: '600',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                          onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                          📺 Watch on YouTube
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <footer style={{ textAlign: 'center', color: 'white', marginTop: '60px', padding: '40px 0', opacity: 0.8 }}>
            <p style={{ margin: 0, fontSize: '16px' }}>
              SoundStories - Discover music with meaning
            </p>
          </footer>
        </div>
      </div>
    );
  }

  // ADMIN PANEL (existing code)
  if (!user || user.email !== ADMIN_EMAIL) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
          <h1 style={{ marginBottom: '30px', color: '#4a5568' }}>🎵 SoundStories Admin</h1>
          
          <p style={{ marginBottom: '30px', color: '#718096' }}>
            Sign in with your authorized Google account to manage music recommendations.
          </p>

          <button 
            onClick={handleGoogleSignIn}
            style={{ 
              width: '100%', 
              background: 'white', 
              color: '#4285f4', 
              padding: '12px 24px', 
              border: '2px solid #4285f4', 
              borderRadius: '10px', 
              fontSize: '16px', 
              cursor: 'pointer', 
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            <span style={{ fontSize: '20px' }}>🔐</span>
            Sign in with Google
          </button>
          
          <p style={{ marginTop: '20px', color: '#718096', fontSize: '14px' }}>
            Admin access only
          </p>
        </div>
      </div>
    );
  }

  // Admin interface (keeping existing admin code)
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Admin Header */}
        <header style={{ textAlign: 'center', color: 'white', marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '20px' }}>
            {user.photoURL && (
              <img 
                src={user.photoURL} 
                alt="Profile" 
                style={{ width: '50px', height: '50px', borderRadius: '50%', border: '3px solid white' }}
              />
            )}
            <div>
              <h1 style={{ fontSize: '3rem', margin: 0 }}>🎵 SoundStories Admin</h1>
              <p style={{ fontSize: '1.2rem', opacity: 0.9, margin: 0 }}>
                Welcome back, {user.displayName}!
              </p>
            </div>
          </div>
          <p style={{ fontSize: '1rem', opacity: 0.8, marginBottom: '20px' }}>
            Manage your curated music recommendations
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button 
              onClick={generateCalendar} 
              disabled={isGenerating}
              style={{ 
                background: isGenerating ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                color: 'white', 
                padding: '12px 24px', 
                border: 'none', 
                borderRadius: '10px', 
                fontSize: '16px', 
                cursor: isGenerating ? 'not-allowed' : 'pointer', 
                fontWeight: '600' 
              }}
            >
              {isGenerating ? '⏳ Updating...' : '📅 Update Calendar'}
            </button>
            <a 
              href="/"
              style={{ 
                background: 'rgba(255,255,255,0.2)', 
                color: 'white', 
                padding: '8px 16px', 
                borderRadius: '20px', 
                textDecoration: 'none',
                display: 'inline-block'
              }}
            >
              👁️ View Public Site
            </a>
            <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer' }}>
              Logout
            </button>
          </div>
        </header>

        {/* Rest of admin interface - keeping your existing code */}
        {/* Add Form */}
        <div style={{ background: 'white', borderRadius: '20px', padding: '30px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
          <h2 style={{ marginBottom: '20px', color: '#4a5568' }}>🎯 Add New Recommendation</h2>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
            <input 
              type="text" 
              placeholder="Song Title & Artist *"
              value={formData.songTitle}
              onChange={(e) => setFormData(prev => ({ ...prev, songTitle: e.target.value }))}
              style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '16px', boxSizing: 'border-box' }}
              required
            />
            <textarea 
              placeholder="Story behind this recommendation *" 
              rows="4"
              value={formData.story}
              onChange={(e) => setFormData(prev => ({ ...prev, story: e.target.value }))}
              style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '16px', resize: 'vertical', boxSizing: 'border-box' }}
              required
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <input 
                type="url" 
                placeholder="🎧 Spotify Link"
                value={formData.spotifyLink}
                onChange={(e) => setFormData(prev => ({ ...prev, spotifyLink: e.target.value }))}
                style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '16px', boxSizing: 'border-box' }}
              />
              <input 
                type="url" 
                placeholder="📺 YouTube Link"
                value={formData.youtubeLink}
                onChange={(e) => setFormData(prev => ({ ...prev, youtubeLink: e.target.value }))}
                style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '16px', boxSizing: 'border-box' }}
              />
            </div>
            <input 
              type="datetime-local"
              value={formData.scheduledDate}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
              style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '16px', boxSizing: 'border-box' }}
              required
            />
            <button type="submit" style={{ width: '100%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '12px 24px', border: 'none', borderRadius: '10px', fontSize: '16px', cursor: 'pointer', fontWeight: '600' }}>
              Add Recommendation
            </button>
          </form>
        </div>

        {/* Stats */}
        <div style={{ background: 'white', borderRadius: '20px', padding: '30px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
          <h2 style={{ marginBottom: '20px', color: '#4a5568' }}>📊 Stats</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '15px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea', marginBottom: '5px' }}>{recommendations.length}</div>
              <div style={{ color: '#4a5568' }}>Total Recommendations</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '15px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#48bb78', marginBottom: '5px' }}>{upcoming.length}</div>
              <div style={{ color: '#4a5568' }}>Upcoming</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '15px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#9f7aea', marginBottom: '5px' }}>{past.length}</div>
              <div style={{ color: '#4a5568' }}>Published</div>
            </div>
          </div>
        </div>

        {/* Upcoming */}
       <div style={{ background: 'white', borderRadius: '20px', padding: '30px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
         <h2 style={{ marginBottom: '20px', color: '#4a5568' }}>📅 Upcoming Recommendations ({upcoming.length})</h2>
         {upcoming.length === 0 ? (
           <p style={{ textAlign: 'center', color: '#718096', fontStyle: 'italic' }}>No upcoming recommendations scheduled.</p>
         ) : (
           upcoming.map(rec => (
             <div key={rec.id} style={{ border: '2px solid #e2e8f0', borderRadius: '15px', padding: '20px', marginBottom: '20px', background: '#f8fafc' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                 <h3 style={{ color: '#2d3748', margin: 0 }}>{rec.songTitle}</h3>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                   <small style={{ color: '#718096' }}>
                     {new Date(rec.scheduledDate).toLocaleDateString()} at {new Date(rec.scheduledDate).toLocaleTimeString()}
                   </small>
                   <button onClick={() => deleteRec(rec.id, rec.songTitle)} style={{ background: '#f56565', color: 'white', padding: '4px 8px', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                     🗑️
                   </button>
                 </div>
               </div>
               <p style={{ marginBottom: '15px', color: '#4a5568' }}>{rec.story}</p>
               <div style={{ display: 'flex', gap: '10px' }}>
                 {rec.spotifyLink && (
                   <a href={rec.spotifyLink} target="_blank" rel="noopener noreferrer" style={{ background: '#1db954', color: 'white', padding: '6px 12px', borderRadius: '20px', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
                     🎧 Spotify
                   </a>
                 )}
                 {rec.youtubeLink && (
                   <a href={rec.youtubeLink} target="_blank" rel="noopener noreferrer" style={{ background: '#ff0000', color: 'white', padding: '6px 12px', borderRadius: '20px', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
                     📺 YouTube
                   </a>
                 )}
               </div>
             </div>
           ))
         )}
       </div>

       {/* Past */}
       <div style={{ background: 'white', borderRadius: '20px', padding: '30px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
         <h2 style={{ marginBottom: '20px', color: '#4a5568' }}>📝 Past Recommendations (Last 10)</h2>
         {past.length === 0 ? (
           <p style={{ textAlign: 'center', color: '#718096', fontStyle: 'italic' }}>No past recommendations yet.</p>
         ) : (
           past.slice(0, 10).map(rec => (
             <div key={rec.id} style={{ border: '2px solid #e2e8f0', borderRadius: '15px', padding: '20px', marginBottom: '20px', background: '#f8fafc', opacity: 0.8 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                 <h3 style={{ color: '#2d3748', margin: 0 }}>{rec.songTitle}</h3>
                 <small style={{ color: '#718096' }}>
                   Published: {new Date(rec.scheduledDate).toLocaleDateString()}
                 </small>
               </div>
               <p style={{ marginBottom: '15px', color: '#4a5568' }}>{rec.story}</p>
               <div style={{ display: 'flex', gap: '10px' }}>
                 {rec.spotifyLink && (
                   <a href={rec.spotifyLink} target="_blank" rel="noopener noreferrer" style={{ background: '#1db954', color: 'white', padding: '6px 12px', borderRadius: '20px', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
                     🎧 Spotify
                   </a>
                 )}
                 {rec.youtubeLink && (
                   <a href={rec.youtubeLink} target="_blank" rel="noopener noreferrer" style={{ background: '#ff0000', color: 'white', padding: '6px 12px', borderRadius: '20px', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
                     📺 YouTube
                   </a>
                 )}
               </div>
             </div>
           ))
         )}
       </div>
     </div>
   </div>
 );
}

export default App;
        