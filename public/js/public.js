let allCollections = [];

function renderCollections(collections) {
  const collTbody = document.querySelector('#collections-table tbody');
  if (collections.length === 0) {
    collTbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">No collections found</td></tr>';
    return;
  }
  collTbody.innerHTML = collections.map(c => `
    <tr>
      <td>${c.date}</td>
      <td>${c.contributorName}</td>
      <td>Rs. ${c.amount.toLocaleString()}</td>
    </tr>
  `).join('');
}

async function fetchDashboardData() {
  try {
    const res = await fetch('/api/dashboard');
    const data = await res.json();

    document.getElementById('stat-balance').textContent = `Rs. ${data.balance.toLocaleString()}`;
    document.getElementById('stat-collected').textContent = `Rs. ${data.totalCollected.toLocaleString()}`;
    document.getElementById('stat-expenses').textContent = `Rs. ${data.totalExpenses.toLocaleString()}`;

    allCollections = data.recentCollections;

    // Check if there is an active search to keep the list filtered during auto-refresh
    const searchInput = document.getElementById('search-collections');
    if (searchInput && searchInput.value) {
      const term = searchInput.value.toLowerCase();
      renderCollections(allCollections.filter(c => c.contributorName.toLowerCase().includes(term)));
    } else {
      renderCollections(allCollections);
    }

    const expTbody = document.querySelector('#expenses-table tbody');
    expTbody.innerHTML = data.recentExpenses.map(e => `
      <tr>
        <td>${e.date}</td>
        <td>${e.title}</td>
        <td>${e.description}</td>
        <td>Rs. ${e.amount.toLocaleString()}</td>
      </tr>
    `).join('');

  } catch (error) {
    console.error('Failed to load dashboard:', error);
  }
}

// Search functionality
const searchInput = document.getElementById('search-collections');
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allCollections.filter(c =>
      c.contributorName.toLowerCase().includes(term)
    );
    renderCollections(filtered);
  });
}

// Initial load
fetchDashboardData();

// Auto-refresh every 30 seconds
setInterval(fetchDashboardData, 30000);