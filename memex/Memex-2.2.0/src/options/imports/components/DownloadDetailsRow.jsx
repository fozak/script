import React from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'

import localStyles from './DownloadDetails.css'

const getRowClasses = isActive =>
    classNames({
        [localStyles.active]: isActive,
        [localStyles.detailsTableRow]: true,
    })

const DownloadDetailsRow = ({
    url,
    downloaded,
    error,
    handleClick,
    isActive,
}) => (
    <tr className={getRowClasses(isActive)} onClick={handleClick}>
        <td className={localStyles.urlCol}>
            {' '}
            <a className={localStyles.link} href={url} target="_blank">
                {url}
            </a>{' '}
        </td>
        {error && <td className={localStyles.errorsCol}>{error}</td>}
    </tr>
)

DownloadDetailsRow.propTypes = {
    // State
    isActive: PropTypes.bool.isRequired,

    // Event handlers
    handleClick: PropTypes.func.isRequired,

    // Data
    url: PropTypes.string.isRequired,
    downloaded: PropTypes.string.isRequired,
    error: PropTypes.string,
}

export default DownloadDetailsRow
