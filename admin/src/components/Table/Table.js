import React from 'react'
import {
    CCard,
    CCardBody,
    CCardFooter,
    CCardHeader,
    CCol,
    CTable,
    CTableBody,
    CTableHead,
    CTableHeaderCell,
    CTableRow,
} from '@coreui/react'
import { CNavLink } from '@coreui/react'

function Table({ heading, btnText, btnURL, tableHeading, pagination, tableContent }) {
    return (
        <>
            <CCol xs={12}>
                <CCard className="mb-4">
                    <CCardHeader style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h3 className="m-0">{heading}</h3>
                        {btnText ? (
                            <CNavLink
                                className="btn btn-ghost-primary active p-1 px-2"
                                href={`#${btnURL}`}
                                active
                            >
                                {btnText}
                            </CNavLink>
                        ) : null}
                    </CCardHeader>
                    <CCardBody>
                        <div
                            className="table-responsive"
                            style={{
                                maxHeight: '400px',
                                overflowX: 'auto',
                                overflowY: 'auto',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <CTable striped hover>
                                <CTableHead>
                                    <CTableRow>
                                        {tableHeading &&
                                            tableHeading.map((item, index) => (
                                                <CTableHeaderCell
                                                    style={{ whiteSpace: 'nowrap' }}
                                                    key={index}
                                                >
                                                    {item}
                                                </CTableHeaderCell>
                                            ))}
                                    </CTableRow>
                                </CTableHead>
                                <CTableBody>{tableContent}</CTableBody>
                            </CTable>
                        </div>
                    </CCardBody>
                    <CCardFooter>
                        {pagination}
                    </CCardFooter>
                </CCard>
            </CCol>
        </>
    )
}

export default Table
