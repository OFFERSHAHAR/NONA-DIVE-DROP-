import React from 'react';
import { EmailConfirmationData } from '@/types/payment';

/**
 * Email template for package confirmation
 * Supports Hebrew (RTL) and professional design
 */

export function PackageConfirmationEmail({ data }: { data: EmailConfirmationData }) {
  const isRTL = true;

  const containerStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    direction: isRTL ? 'rtl' : 'ltr',
    backgroundColor: '#f5f5f5',
    padding: '20px',
  };

  const contentStyle: React.CSSProperties = {
    maxWidth: '600px',
    margin: '0 auto',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #0066cc 0%, #00c9ff 100%)',
    color: 'white',
    padding: '40px 20px',
    textAlign: isRTL ? 'right' : 'left',
  };

  const bodyStyle: React.CSSProperties = {
    padding: '40px 20px',
    color: '#333',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '10px',
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '14px',
    opacity: 0.9,
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 'bold',
    marginTop: '30px',
    marginBottom: '15px',
    color: '#0066cc',
    borderBottom: '2px solid #00c9ff',
    paddingBottom: '10px',
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: '20px',
  };

  const tableHeaderStyle: React.CSSProperties = {
    backgroundColor: '#f0f0f0',
    padding: '12px',
    textAlign: isRTL ? 'right' : 'left',
    fontWeight: 'bold',
    borderBottom: '2px solid #ddd',
  };

  const tableCellStyle: React.CSSProperties = {
    padding: '12px',
    borderBottom: '1px solid #eee',
    textAlign: isRTL ? 'right' : 'left',
  };

  const totalCellStyle: React.CSSProperties = {
    ...tableCellStyle,
    fontWeight: 'bold',
    backgroundColor: '#f9f9f9',
    fontSize: '16px',
  };

  const footerStyle: React.CSSProperties = {
    backgroundColor: '#f5f5f5',
    padding: '20px',
    textAlign: 'center',
    fontSize: '12px',
    color: '#666',
    borderTop: '1px solid #ddd',
  };

  const providerCardStyle: React.CSSProperties = {
    backgroundColor: '#f9f9f9',
    padding: '15px',
    marginBottom: '15px',
    borderRadius: '4px',
    borderLeft: '4px solid #00c9ff',
  };

  const providerTitleStyle: React.CSSProperties = {
    fontWeight: 'bold',
    fontSize: '14px',
    marginBottom: '5px',
  };

  const providerDetailsStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#666',
    lineHeight: '1.6',
  };

  const ctaButtonStyle: React.CSSProperties = {
    display: 'inline-block',
    backgroundColor: '#0066cc',
    color: 'white',
    padding: '12px 30px',
    borderRadius: '4px',
    textDecoration: 'none',
    fontWeight: 'bold',
    marginTop: '20px',
  };

  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={titleStyle}>✅ הצלילה שלך מאושרת</div>
          <div style={subtitleStyle}>DiveDrop - אישור פרטי החבילה</div>
        </div>

        {/* Main Content */}
        <div style={bodyStyle}>
          <p style={{ fontSize: '16px', marginBottom: '20px' }}>
            שלום {data.customer_name},
          </p>

          <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px', lineHeight: '1.6' }}>
            אנחנו שמחים לאשר את הצלילה שלך ופרטי החבילה שלך. כל הפרטים שלהלן:
          </p>

          {/* Package Items Table */}
          <div style={sectionTitleStyle}>📋 פרטי החבילה</div>

          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>שירות</th>
                <th style={tableHeaderStyle}>ספק</th>
                <th style={tableHeaderStyle}>מחיר</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, idx) => (
                <tr key={idx}>
                  <td style={tableCellStyle}>{item.service_name}</td>
                  <td style={tableCellStyle}>{item.provider_name}</td>
                  <td style={tableCellStyle}>₪{item.price}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={2} style={totalCellStyle}>
                  סה"כ
                </td>
                <td style={totalCellStyle}>₪{data.total_amount}</td>
              </tr>
            </tbody>
          </table>

          {/* Dive Details */}
          {data.booking_date && (
            <>
              <div style={sectionTitleStyle}>🌊 פרטי הצלילה</div>
              <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#555' }}>
                <div>📅 תאריך: {data.booking_date}</div>
                {data.booking_time && <div>🕐 שעה: {data.booking_time}</div>}
                {data.dive_site && <div>📍 מקום: {data.dive_site}</div>}
              </div>
            </>
          )}

          {/* Provider Details */}
          <div style={sectionTitleStyle}>👤 פרטי הספקים</div>
          {data.providers.map((provider, idx) => (
            <div key={idx} style={providerCardStyle}>
              <div style={providerTitleStyle}>{provider.name}</div>
              <div style={providerDetailsStyle}>
                {provider.phone && <div>📱 {provider.phone}</div>}
                {provider.experience && <div>⭐ {provider.experience} שנות ניסיון</div>}
              </div>
            </div>
          ))}

          {/* CTA Button */}
          <div style={{ textAlign: isRTL ? 'right' : 'left', marginTop: '30px' }}>
            <a href={`https://divedrop.com/dashboard/packages/${data.package_id}`} style={ctaButtonStyle}>
              צפה בחבילה המלאה →
            </a>
          </div>

          {/* Contact Info */}
          <p
            style={{
              fontSize: '12px',
              color: '#999',
              marginTop: '30px',
              textAlign: 'center',
              borderTop: '1px solid #eee',
              paddingTop: '20px',
            }}
          >
            יש שאלות? צור קשר: <a href="mailto:support@divedrop.com">support@divedrop.com</a>
          </p>
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <p>DiveDrop © 2026 - כל הזכויות שמורות</p>
          <p>בהצלחה בצלילה! 🌊</p>
        </div>
      </div>
    </div>
  );
}
