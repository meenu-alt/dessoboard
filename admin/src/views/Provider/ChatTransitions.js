import React from 'react';

function ChatTransitions({ chatTransitions }) {
    if (!chatTransitions || chatTransitions.length === 0) {
        return <p>No transitions available</p>;
    }

    return (
        <div>
            <h3>Chat Transitions</h3>
            <table>
                <thead>
                    <tr>
                        <th>S.No</th>
                        <th>Start Time</th>
                        <th>End Time</th>
                        <th>Price/Min</th>
                        <th>Deduction</th>
                        <th>Remaining Time</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    {chatTransitions.map((transition, index) => (
                        <tr key={transition._id}>
                            <td>{index + 1}</td>
                            <td>{new Date(transition.startChatTime).toLocaleString()}</td>
                            <td>{new Date(transition.endingChatTime).toLocaleString()}</td>
                            <td>{transition.providerPricePerMin}</td>
                            <td>{transition.deductionAmount}</td>
                            <td>{transition.chatTimingRemaining} mins</td>
                            <td>{new Date(transition.Date).toLocaleDateString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default ChatTransitions;
