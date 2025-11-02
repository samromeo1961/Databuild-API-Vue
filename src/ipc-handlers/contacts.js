const { getPool } = require('../database/connection');

/**
 * Get all contact groups for filtering
 * IPC Handler: 'contacts:get-groups'
 * Note: ContactGroup table doesn't exist in this database
 * Returns empty list for compatibility
 */
async function getContactGroups(event, params) {
  try {
    // ContactGroup table doesn't exist - return empty list
    return {
      success: true,
      count: 0,
      data: []
    };

  } catch (err) {
    console.error('Error fetching contact groups:', err);
    return {
      success: false,
      error: 'Failed to fetch contact groups',
      message: err.message
    };
  }
}

/**
 * Get all contacts
 * IPC Handler: 'contacts:get-list'
 * Parameters:
 *   - search: Filter by name, contact person, or email
 *   - group: Filter by contact group code (supports comma-separated)
 *   - limit: Number of records to return (default: 100)
 *   - offset: Pagination offset (default: 0)
 */
async function getContactsList(event, params) {
  try {
    const { search, group, limit = 100, offset = 0 } = params || {};

    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    // Build WHERE clause - Filter out blank contacts
    let whereConditions = ['(C.Name IS NOT NULL AND C.Name != \'\')'];
    const request = pool.request();

    // Add contact group filter - supports single or multiple groups (comma-separated)
    if (group) {
      const groupArray = group.split(',').map(g => parseInt(g.trim())).filter(g => !isNaN(g));
      if (groupArray.length === 1) {
        whereConditions.push('C.Group_ = @group');
        request.input('group', groupArray[0]);
      } else if (groupArray.length > 1) {
        const placeholders = groupArray.map((_, index) => `@group${index}`).join(',');
        whereConditions.push(`C.Group_ IN (${placeholders})`);
        groupArray.forEach((groupCode, index) => {
          request.input(`group${index}`, groupCode);
        });
      }
    }

    // Enhanced search: search across Name, Contact, and Email
    // Support multiple words in any order
    if (search) {
      const searchWords = search.trim().split(/\s+/).filter(word => word.length > 0);

      if (searchWords.length === 1) {
        // Single word: search across all fields
        whereConditions.push(`(
          C.Name LIKE @search
          OR C.Contact LIKE @search
          OR C.Email LIKE @search
        )`);
        request.input('search', `%${search}%`);
      } else {
        // Multiple words: each word must appear in at least one of the fields
        const searchConditions = searchWords.map((word, index) => {
          request.input(`searchWord${index}`, `%${word}%`);
          return `(C.Name LIKE @searchWord${index} OR C.Contact LIKE @searchWord${index} OR C.Email LIKE @searchWord${index})`;
        });

        // All words must match (each word in at least one field)
        whereConditions.push(`(${searchConditions.join(' AND ')})`);
      }
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Query to get contacts
    const query = `
      SELECT
        C.Code,
        C.Name,
        C.Contact,
        C.Email,
        C.Phone,
        C.Mobile,
        C.Fax,
        C.Address,
        C.City,
        C.State,
        C.Postcode,
        C.Group_,
        C.Dear,
        C.Debtor,
        C.Supplier,
        C.OSC,
        C.Notes
      FROM Contacts C
      ${whereClause}
      ORDER BY C.Name
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    request.input('offset', parseInt(offset));
    request.input('limit', parseInt(limit));

    // Get total count
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM Contacts C
      ${whereClause}
    `;

    const countRequest = pool.request();
    if (group) {
      const groupArray = group.split(',').map(g => parseInt(g.trim())).filter(g => !isNaN(g));
      if (groupArray.length === 1) {
        countRequest.input('group', groupArray[0]);
      } else if (groupArray.length > 1) {
        groupArray.forEach((groupCode, index) => {
          countRequest.input(`group${index}`, groupCode);
        });
      }
    }
    if (search) {
      // Apply same multi-word search logic for count query
      const searchWords = search.trim().split(/\s+/).filter(word => word.length > 0);

      if (searchWords.length === 1) {
        countRequest.input('search', `%${search}%`);
      } else {
        searchWords.forEach((word, index) => {
          countRequest.input(`searchWord${index}`, `%${word}%`);
        });
      }
    }

    const [result, countResult] = await Promise.all([
      request.query(query),
      countRequest.query(countQuery)
    ]);

    return {
      success: true,
      total: countResult.recordset[0]?.total || 0,
      limit: parseInt(limit),
      offset: parseInt(offset),
      count: result.recordset.length,
      filters: {
        search: search || null,
        group: group || null
      },
      data: result.recordset
    };

  } catch (err) {
    console.error('Error fetching contacts:', err);
    return {
      success: false,
      error: 'Failed to fetch contacts',
      message: err.message
    };
  }
}

/**
 * Create a new contact
 * IPC Handler: 'contacts:create'
 */
async function createContact(event, contactData) {
  try {
    const { code, name, contact, email, phone, mobile, fax, address, city, state, postcode, group, dear, notes, debtor, supplier, osc } = contactData;

    // Validate required fields
    if (!code || !name) {
      return {
        success: false,
        error: 'Contact code and name are required'
      };
    }

    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const request = pool.request();
    request.input('code', code);

    // Check if contact code already exists
    const checkQuery = `
      SELECT Code
      FROM Contacts
      WHERE Code = @code
    `;

    const checkResult = await request.query(checkQuery);

    if (checkResult.recordset.length > 0) {
      return {
        success: false,
        error: 'Contact code already exists'
      };
    }

    // Create new contact
    const insertRequest = pool.request();
    insertRequest.input('code', code);
    insertRequest.input('name', name);
    insertRequest.input('contact', contact || null);
    insertRequest.input('email', email || null);
    insertRequest.input('phone', phone || null);
    insertRequest.input('mobile', mobile || null);
    insertRequest.input('fax', fax || null);
    insertRequest.input('address', address || null);
    insertRequest.input('city', city || null);
    insertRequest.input('state', state || null);
    insertRequest.input('postcode', postcode || null);
    insertRequest.input('group', group || 1); // Default to clients (group 1)
    insertRequest.input('dear', dear || null);
    insertRequest.input('notes', notes || null);
    insertRequest.input('debtor', debtor === true ? 1 : 0);
    insertRequest.input('supplier', supplier === true ? 1 : 0);
    insertRequest.input('osc', osc === true ? 1 : 0);

    const insertQuery = `
      INSERT INTO Contacts (
        Code,
        Name,
        Contact,
        Email,
        Phone,
        Mobile,
        Fax,
        Address,
        City,
        State,
        Postcode,
        Group_,
        Dear,
        Notes,
        Debtor,
        Supplier,
        OSC
      ) VALUES (
        @code,
        @name,
        @contact,
        @email,
        @phone,
        @mobile,
        @fax,
        @address,
        @city,
        @state,
        @postcode,
        @group,
        @dear,
        @notes,
        @debtor,
        @supplier,
        @osc
      )
    `;

    await insertRequest.query(insertQuery);

    // Fetch the newly created contact
    const getNewQuery = `
      SELECT
        C.Code,
        C.Name,
        C.Contact,
        C.Email,
        C.Phone,
        C.Mobile,
        C.Fax,
        C.Address,
        C.City,
        C.State,
        C.Postcode,
        C.Group_,
        C.Dear,
        C.Notes,
        C.Debtor,
        C.Supplier,
        C.OSC
      FROM Contacts C
      WHERE C.Code = @code
    `;

    const result = await pool.request()
      .input('code', code)
      .query(getNewQuery);

    return {
      success: true,
      message: 'Contact created successfully',
      data: result.recordset[0]
    };

  } catch (err) {
    console.error('Error creating contact:', err);
    return {
      success: false,
      error: 'Failed to create contact',
      message: err.message
    };
  }
}

/**
 * Update contact information
 * IPC Handler: 'contacts:update'
 */
async function updateContact(event, { code, updates }) {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const request = pool.request();
    request.input('code', code);

    // First verify contact exists
    const contactCheckQuery = `
      SELECT Code, Name
      FROM Contacts
      WHERE Code = @code
    `;

    const contactCheck = await request.query(contactCheckQuery);

    if (contactCheck.recordset.length === 0) {
      return {
        success: false,
        error: 'Contact not found'
      };
    }

    // Build update query
    const updateFields = [];
    const updateRequest = pool.request();
    updateRequest.input('code', code);

    const { name, contact, email, phone, mobile, fax, address, city, state, postcode, group, dear, notes } = updates;

    if (name !== undefined) {
      updateFields.push('Name = @name');
      updateRequest.input('name', name);
    }
    if (contact !== undefined) {
      updateFields.push('Contact = @contact');
      updateRequest.input('contact', contact);
    }
    if (email !== undefined) {
      updateFields.push('Email = @email');
      updateRequest.input('email', email);
    }
    if (phone !== undefined) {
      updateFields.push('Phone = @phone');
      updateRequest.input('phone', phone);
    }
    if (mobile !== undefined) {
      updateFields.push('Mobile = @mobile');
      updateRequest.input('mobile', mobile);
    }
    if (fax !== undefined) {
      updateFields.push('Fax = @fax');
      updateRequest.input('fax', fax);
    }
    if (address !== undefined) {
      updateFields.push('Address = @address');
      updateRequest.input('address', address);
    }
    if (city !== undefined) {
      updateFields.push('City = @city');
      updateRequest.input('city', city);
    }
    if (state !== undefined) {
      updateFields.push('State = @state');
      updateRequest.input('state', state);
    }
    if (postcode !== undefined) {
      updateFields.push('Postcode = @postcode');
      updateRequest.input('postcode', postcode);
    }
    if (group !== undefined) {
      updateFields.push('Group_ = @group');
      updateRequest.input('group', group);
    }
    if (dear !== undefined) {
      updateFields.push('Dear = @dear');
      updateRequest.input('dear', dear);
    }
    if (notes !== undefined) {
      updateFields.push('Notes = @notes');
      updateRequest.input('notes', notes);
    }

    if (updateFields.length === 0) {
      return {
        success: false,
        error: 'No fields to update'
      };
    }

    const updateQuery = `
      UPDATE Contacts
      SET ${updateFields.join(', ')}
      WHERE Code = @code
    `;

    await updateRequest.query(updateQuery);

    // Return updated contact
    const getUpdatedQuery = `
      SELECT
        C.Code,
        C.Name,
        C.Contact,
        C.Email,
        C.Phone,
        C.Mobile,
        C.Fax,
        C.Address,
        C.City,
        C.State,
        C.Postcode,
        C.Group_,
        C.Dear,
        C.Notes,
        C.Debtor,
        C.Supplier,
        C.OSC
      FROM Contacts C
      WHERE C.Code = @code
    `;

    const result = await pool.request()
      .input('code', code)
      .query(getUpdatedQuery);

    return {
      success: true,
      message: 'Contact updated successfully',
      data: result.recordset[0]
    };

  } catch (err) {
    console.error('Error updating contact:', err);
    return {
      success: false,
      error: 'Failed to update contact',
      message: err.message
    };
  }
}

module.exports = {
  getContactGroups,
  getContactsList,
  createContact,
  updateContact
};
