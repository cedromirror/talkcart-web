// Fix for the truncated admin.js file - append this to the end

    console.error('admin vendor performance error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch vendor performance' });
  }
});

module.exports = router;