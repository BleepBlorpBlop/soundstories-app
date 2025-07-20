import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
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

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [calendarUrl, setCalendarUrl] = useState('');
  const [formData, setFormData] = useState({
    songTitle: '',
    story: '',
    spotifyLink: '',
    youtubeLink: '',
    scheduledDate: ''
  });

  // Your admin email - change this to your Gmail address
  const ADMIN_EMAIL = 'chris@heroiccontent.com'; // CHANGE THIS TO YOUR GMAIL

  const provider = new GoogleAuthProvider();

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      if (user && user.email === ADMIN_EMAIL) {
        loadRecommendations();
      } else if (user && user.email !== ADMIN_EMAIL) {
        // Not admin - sign them out
        signOut(auth);
        alert(`Access denied. Only ${ADMIN_EMAIL} can access this admin panel.`);
      } else {
        setRecommendations([]);
      }
    });
    return unsubscribe;
  }, []);

  // Load all recommendations from Firestore
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
      alert('Recommendation added successfully!');
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
        alert('Deleted successfully!');
      } catch (error) {
        alert('Error deleting: ' + error.message);
      }
    }
  };

  const generateCalendar = () => {
    if (recommendations.length === 0) {
      alert('Add recommendations first');
      return;
    }
    setCalendarUrl(`webcal://soundstories.app/public-feed-${Date.now()}.ics`);
    alert(`Public calendar generated with ${recommendations.length} events!`);
  };

  // Split by date
  const now = new Date();
  const upcoming = recommendations.filter(r => new Date(r.scheduledDate) > now);
  const past = recommendations.filter(r => new Date(r.scheduledDate) <= now).slice(0, 10);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white', fontSize: '1.5rem' }}>🎵 Loading SoundStories...</div>
      </div>
    );
  }

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
            Only {ADMIN_EMAIL} has admin access
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
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
                Welcome back, {user.displayName || user.email}!
              </p>
            </div>
          </div>
          <p style={{ fontSize: '1rem', opacity: 0.8, marginBottom: '20px' }}>
            Manage your curated music recommendations
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={generateCalendar} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '12px 24px', border: 'none', borderRadius: '10px', fontSize: '16px', cursor: 'pointer', fontWeight: '600' }}>
              📅 Generate Public Calendar
            </button>
            <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer' }}>
              Logout
            </button>
          </div>
        </header>

        {/* Calendar URL */}
        {calendarUrl && (
          <div style={{ background: 'white', borderRadius: '20px', padding: '30px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
            <h2 style={{ marginBottom: '20px', color: '#4a5568' }}>📅 Public Calendar Feed</h2>
            <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '20px', borderRadius: '15px' }}>
              <p style={{ marginBottom: '15px' }}>Share this URL for public calendar subscriptions:</p>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '14px', wordBreak: 'break-all', marginBottom: '15px' }}>
                {calendarUrl}
              </div>
              <button onClick={() => navigator.clipboard.writeText(calendarUrl)} style={{ background: '#48bb78', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                📋 Copy Public URL
              </button>
            </div>
          </div>
        )}

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
            past.map(rec => (
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