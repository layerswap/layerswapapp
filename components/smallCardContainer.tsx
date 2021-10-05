export default function SmallCardContainer(props) {
    return (<div className="py-8 md:py-16 px-4 md:px-0" {...props}>
        <div className="bg-gradient-to-r from-indigo-400 to-pink-400 shadow-lg p-1 rounded-3xl">
            <div className="bg-white shadow-lg rounded-3xl px-8 md:px-14 py-8">
                {props.children}
            </div>
        </div>
    </div>);
}