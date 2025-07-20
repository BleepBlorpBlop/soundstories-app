import React, { useState, useEffect } from 'react';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [calendarUrl, setCalendarUrl] = useState('');
  const [formData, setFormData] = useState({
    songTitle: '',
    story: '',
    spotifyLink: '',
    youtubeLink: '',
    scheduledDate: ''
  });

  // Generate calendar feed
  const generateCalendar = () => {
    if (recommendations.length === 0) {
      alert('Please add at least one recommendation before generating the calendar.');
      return;
    }

    const icsContent = generateICSContent();
    
    // In a real app, you'd upload this to your server
    // For now, we'll simulate the URL
    const mockCalendarUrl = `webcal://soundstories.app/calendar/feed-${Date.now()}.ics`;
    setCalendarUrl(mockCalendarUrl);
    
    // Show the ICS content in console for testing
    console.log('Generated ICS Calendar:');
    console.log(icsContent);
    
    alert(`Calendar generated! ${recommendations.length} recommendations converted to calendar events.`);
  };

  const generateICSContent = () => {
    const now = new Date();
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
REFRESH-INTERVAL;VALUE=DURATION:PT4H`;

    const events = recommendations.map(rec => {
      const startDate = new Date(rec.scheduledDate);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration

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

  const copyCalendarUrl = () => {
    if (!calendarUrl) {
      alert('Please generate the calendar first.');
      return;
    }
    
    navigator.clipboard.writeText(calendarUrl).then(() => {
      alert('Calendar URL copied to clipboard!');
    }).catch(() => {
      alert('Could not copy URL. Please copy manually: ' + calendarUrl);
    });
  };

  // Mock Spotify search function
  const searchSpotify = async (query) => {
    if (query.length < 2) return [];
    
    setIsSearching(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const mockResults = [
      {
        id: '1',
        name: 'Bohemian Rhapsody',
        artists: [{ name: 'Queen' }],
        album: { name: 'A Night at the Opera', images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273ce4f1737bc8a646c8c4bd25a' }] },
        external_urls: { spotify: 'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh' }
      },
      {
        id: '2',
        name: 'Hotel California',
        artists: [{ name: 'Eagles' }],
        album: { name: 'Hotel California', images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2734637341b9f507521afa9a778' }] },
        external_urls: { spotify: 'https://open.spotify.com/track/40riOy7x9W7GXjyGp4pjAv' }
      },
      {
        id: '3',
        name: 'Stairway to Heaven',
        artists: [{ name: 'Led Zeppelin' }],
        album: { name: 'Led Zeppelin IV', images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273c8a11e48c91a982d086afc69' }] },
        external_urls: { spotify: 'https://open.spotify.com/track/5CQ30WqJwcep0pYcV4AMNc' }
      },
      {
        id: '4',
        name: 'Sweet Child O\' Mine',
        artists: [{ name: 'Guns N\' Roses' }],
        album: { name: 'Appetite for Destruction', images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273a9c4b58c9427dbb5c3ae6b49' }] },
        external_urls: { spotify: 'https://open.spotify.com/track/7o2CTH4ctstm8TNelqjb51' }
      }
    ];

    const filtered = mockResults.filter(track => 
      track.name.toLowerCase().includes(query.toLowerCase()) ||
      track.artists[0].name.toLowerCase().includes(query.toLowerCase())
    );

    setIsSearching(false);
    return filtered;
  };

  const handleSpotifySearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const results = await searchSpotify(query);
    setSearchResults(results);
    setShowSearchResults(true);
  };

  const selectSpotifyTrack = (track) => {
    setFormData(prev => ({
      ...prev,
      songTitle: `${track.name} - ${track.artists[0].name}`,
      spotifyLink: track.external_urls.spotify
    }));
    setSearchQuery(`${track.name} - ${track.artists[0].name}`);
    setShowSearchResults(false);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'soundstories2025') {
      setIsAuthenticated(true);
      setPassword('');
    } else {
      alert('Incorrect password');
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.songTitle || !formData.story || !formData.scheduledDate) {
      alert('Please fill in all required fields (song title, story, and scheduled date)');
      return;
    }

    const newRecommendation = {
      id: Date.now(),
      ...formData,
      createdAt: new Date().toISOString()
    };

    setRecommendations([newRecommendation, ...recommendations]);
    
    // Clear form
    setFormData({
      songTitle: '',
      story: '',
      spotifyLink: '',
      youtubeLink: '',
      scheduledDate: ''
    });
    setSearchQuery('');

    alert('Recommendation added successfully!');
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const deleteRecommendation = (id) => {
  const recommendation = recommendations.find(rec => rec.id === id);
  const confirmMessage = `Are you sure you want to delete "${recommendation?.songTitle}"?\n\nThis action cannot be undone.`;
  
  if (window.confirm(confirmMessage)) {
    setRecommendations(recommendations.filter(rec => rec.id !== id));
    alert('Recommendation deleted successfully!');
  }
};

  // Split recommendations
  const now = new Date();
  const upcomingRecommendations = recommendations.filter(rec => 
    new Date(rec.scheduledDate) > now
  ).sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

  const pastRecommendations = recommendations.filter(rec => 
    new Date(rec.scheduledDate) <= now
  ).sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate))
  .slice(0, 10);

  const styles = {
    loginContainer: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    },
    loginBox: {
      background: 'white',
      padding: '40px',
      borderRadius: '20px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
      textAlign: 'center',
      maxWidth: '400px',
      width: '100%'
    },
    app: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    },
    header: {
      textAlign: 'center',
      color: 'white',
      marginBottom: '40px',
      maxWidth: '1200px',
      margin: '0 auto 40px auto'
    },
    panel: {
      background: 'white',
      borderRadius: '20px',
      padding: '30px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
      maxWidth: '1200px',
      margin: '0 auto 30px auto'
    },
    input: {
      width: '100%',
      padding: '12px',
      border: '2px solid #e2e8f0',
      borderRadius: '10px',
      fontSize: '16px',
      marginBottom: '20px',
      boxSizing: 'border-box'
    },
    button: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '12px 24px',
      border: 'none',
      borderRadius: '10px',
      fontSize: '16px',
      cursor: 'pointer',
      fontWeight: '600'
    },
    secondaryButton: {
      background: '#48bb78',
      color: 'white',
      padding: '12px 24px',
      border: 'none',
      borderRadius: '10px',
      fontSize: '16px',
      cursor: 'pointer',
      fontWeight: '600',
      marginLeft: '10px'
    },
    dangerButton: {
      background: '#f56565',
      color: 'white',
      padding: '8px 16px',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      cursor: 'pointer',
      fontWeight: '600'
    },
    recommendationItem: {
      border: '2px solid #e2e8f0',
      borderRadius: '15px',
      padding: '20px',
      marginBottom: '20px',
      background: '#f8fafc'
    },
    searchResults: {
      position: 'absolute',
      top: '100%',
      left: '0',
      right: '0',
      background: 'white',
      border: '2px solid #e2e8f0',
      borderTop: 'none',
      borderRadius: '0 0 10px 10px',
      maxHeight: '200px',
      overflowY: 'auto',
      zIndex: 1000
    },
    searchItem: {
      padding: '12px',
      borderBottom: '1px solid #e2e8f0',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginBox}>
          <h1 style={{ marginBottom: '30px', color: '#4a5568' }}>
            🎵 SoundStories Admin
          </h1>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
            />
            <button type="submit" style={{ ...styles.button, width: '100%' }}>
              Login
            </button>
          </form>
          <p style={{ marginTop: '20px', color: '#718096', fontSize: '14px' }}>
            Demo password: soundstories2025
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={{ fontSize: '3rem', marginBottom: '10px' }}>🎵 SoundStories</h1>
        <p style={{ fontSize: '1.2rem', opacity: 0.9, marginBottom: '20px' }}>
          Curated music recommendations delivered through your calendar
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={generateCalendar}
            style={styles.button}
          >
            📅 Generate Calendar Feed
          </button>
          <button 
            onClick={() => setIsAuthenticated(false)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '20px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Calendar Subscription Panel */}
      {calendarUrl && (
        <div style={styles.panel}>
          <h2 style={{ marginBottom: '20px', color: '#4a5568' }}>📅 Calendar Subscription</h2>
          
          <div style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
            color: 'white', 
            padding: '20px', 
            borderRadius: '15px',
            marginBottom: '20px'
          }}>
            <h3 style={{ marginBottom: '15px' }}>🎵 Subscribe to SoundStories</h3>
            <p style={{ marginBottom: '15px', opacity: 0.9 }}>
              Copy this URL and add it to your calendar app to receive weekly music recommendations:
            </p>
            
            <div style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '12px',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '14px',
              wordBreak: 'break-all',
              marginBottom: '15px'
            }}>
              {calendarUrl}
            </div>
            
            <button onClick={copyCalendarUrl} style={{ ...styles.secondaryButton, marginLeft: '0' }}>
              📋 Copy Calendar URL
            </button>
          </div>

          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '10px' }}>
            <h4 style={{ color: '#4a5568', marginBottom: '15px' }}>📱 How to Subscribe:</h4>
            <div style={{ display: 'grid', gap: '10px', fontSize: '14px', color: '#4a5568' }}>
              <div><strong>📱 iPhone/iPad:</strong> Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar</div>
              <div><strong>🖥️ Google Calendar:</strong> Left sidebar → Other calendars → + → From URL</div>
              <div><strong>💻 Outlook:</strong> File → Account Settings → Internet Calendars → New</div>
              <div><strong>🍎 Mac Calendar:</strong> File → New Calendar Subscription</div>
            </div>
          </div>
        </div>
      )}

      <div style={styles.panel}>
        <h2 style={{ marginBottom: '20px', color: '#4a5568' }}>🎯 Add New Recommendation</h2>
        
        <form onSubmit={handleFormSubmit} style={{ display: 'grid', gap: '20px' }}>
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#2d3748' }}>
              🎵 Search Spotify
            </label>
            <input 
              type="text" 
              placeholder="Search for a song or artist..."
              value={searchQuery}
              onChange={(e) => handleSpotifySearch(e.target.value)}
              style={{ ...styles.input, marginBottom: '0' }}
            />
            {isSearching && (
              <div style={{ ...styles.searchResults, padding: '12px', textAlign: 'center' }}>
                🔍 Searching...
              </div>
            )}
            {showSearchResults && searchResults.length > 0 && (
              <div style={styles.searchResults}>
                {searchResults.map(track => (
                  <div 
                    key={track.id}
                    style={styles.searchItem}
                    onClick={() => selectSpotifyTrack(track)}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                  >
                    <img 
                      src={track.album.images[0]?.url || 'https://via.placeholder.com/40'} 
                      alt={track.name}
                      style={{ width: '40px', height: '40px', borderRadius: '4px' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{track.name}</div>
                      <div style={{ color: '#718096', fontSize: '12px' }}>{track.artists[0].name}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {showSearchResults && searchResults.length === 0 && !isSearching && searchQuery.length > 1 && (
              <div style={{ ...styles.searchResults, padding: '12px', textAlign: 'center', color: '#718096' }}>
                No results found for "{searchQuery}"
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#2d3748' }}>
              Song Title & Artist *
            </label>
            <input 
              type="text" 
              placeholder="e.g., Bohemian Rhapsody - Queen"
              value={formData.songTitle}
              onChange={(e) => handleInputChange('songTitle', e.target.value)}
              style={{ ...styles.input, marginBottom: '0' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#2d3748' }}>
              Story *
            </label>
            <textarea 
              placeholder="Tell the story behind this recommendation..." 
              rows="4"
              value={formData.story}
              onChange={(e) => handleInputChange('story', e.target.value)}
              style={{ ...styles.input, marginBottom: '0', resize: 'vertical' }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#2d3748' }}>
                🎧 Spotify Link
              </label>
              <input 
                type="url" 
                placeholder="https://open.spotify.com/track/..."
                value={formData.spotifyLink}
                onChange={(e) => handleInputChange('spotifyLink', e.target.value)}
                style={{ ...styles.input, marginBottom: '0' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#2d3748' }}>
                📺 YouTube Link
              </label>
              <input 
                type="url" 
                placeholder="https://youtube.com/watch?v=..."
                value={formData.youtubeLink}
                onChange={(e) => handleInputChange('youtubeLink', e.target.value)}
                style={{ ...styles.input, marginBottom: '0' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#2d3748' }}>
              Scheduled Date & Time *
            </label>
            <input 
              type="datetime-local"
              value={formData.scheduledDate}
              onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
              style={{ ...styles.input, marginBottom: '0' }}
              required
            />
          </div>

          <button type="submit" style={{ ...styles.button, width: '100%' }}>
            Add Recommendation
          </button>
        </form>
      </div>

      {/* Upcoming Recommendations */}
      <div style={styles.panel}>
        <h2 style={{ marginBottom: '20px', color: '#4a5568' }}>
          📅 Upcoming Recommendations ({upcomingRecommendations.length})
        </h2>
        
        {upcomingRecommendations.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#718096', fontStyle: 'italic' }}>
            No upcoming recommendations scheduled.
          </p>
        ) : (
          upcomingRecommendations.map(rec => (
            <div key={rec.id} style={styles.recommendationItem}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ color: '#2d3748', margin: 0 }}>{rec.songTitle}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <small style={{ color: '#718096' }}>
                    {new Date(rec.scheduledDate).toLocaleDateString()} at {new Date(rec.scheduledDate).toLocaleTimeString()}
                  </small>
                  <button 
                    onClick={() => deleteRecommendation(rec.id)}
                    style={styles.dangerButton}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
              
              <p style={{ marginBottom: '15px', lineHeight: '1.6', color: '#4a5568' }}>
                {rec.story}
              </p>
              
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {rec.spotifyLink && (
                  <a 
                    href={rec.spotifyLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      background: '#1db954',
                      color: 'white',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    🎧 Spotify
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
                      padding: '8px 16px',
                      borderRadius: '20px',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    📺 YouTube
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Past Recommendations */}
      <div style={styles.panel}>
        <h2 style={{ marginBottom: '20px', color: '#4a5568' }}>
          📝 Past Recommendations (Last 10)
        </h2>
        
        {pastRecommendations.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#718096', fontStyle: 'italic' }}>
            No past recommendations yet.
          </p>
        ) : (
          pastRecommendations.map(rec => (
            <div key={rec.id} style={{ ...styles.recommendationItem, opacity: 0.8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ color: '#2d3748', margin: 0 }}>{rec.songTitle}</h3>
                <small style={{ color: '#718096' }}>
                  Published: {new Date(rec.scheduledDate).toLocaleDateString()}
                </small>
              </div>
              
              <p style={{ marginBottom: '15px', lineHeight: '1.6', color: '#4a5568' }}>
                {rec.story}
              </p>
              
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {rec.spotifyLink && (
                  <a 
                    href={rec.spotifyLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      background: '#1db954',
                      color: 'white',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    🎧 Spotify
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
                      padding: '8px 16px',
                      borderRadius: '20px',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    📺 YouTube
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;